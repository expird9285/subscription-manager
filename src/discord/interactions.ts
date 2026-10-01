import type { Context } from "hono";

import { listPaymentCards } from "../db/payment-methods";
import { getState } from "../db/state";
import {
  listUserSubscriptionsBetween,
  listUserSubscriptionsByStatus,
} from "../db/subscriptions";
import { getUserByDiscordId } from "../db/users";
import { discordConfig, isAllowedDiscordId, timeZoneOf } from "../lib/config";
import { addDays, formatDateTime, monthRange, todayIn } from "../lib/dates";
import { convertTotalsToKrw, getExchangeRates, hasForeignCurrency } from "../lib/exchange-rates";
import { alertStatuses, formatMoney, liveStatuses, sharedPrice } from "../lib/subscriptions";
import type { AppEnv, User } from "../lib/types";
import { LAST_ALERT_KEY, sendTestAlert } from "./alerts";
import { editOriginalResponse, type DiscordEmbed, type MessagePayload } from "./api";
import type { CommandName } from "./commands";
import { EMBED_COLOR, listEmbed } from "./format";
import { verifyDiscordSignature } from "./verify";

// https://discord.com/developers/docs/interactions/receiving-and-responding
const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 } as const;
const ResponseType = { PONG: 1, CHANNEL_MESSAGE: 4, DEFERRED_CHANNEL_MESSAGE: 5 } as const;
const EPHEMERAL = 1 << 6;

type Interaction = {
  type: number;
  token: string;
  application_id: string;
  data?: { name?: string };
  member?: { user?: { id: string } };
  user?: { id: string };
};

type CommandContext = {
  env: Env;
  user: User;
  today: string;
  waitUntil: (promise: Promise<unknown>) => void;
  colo?: string;
};

function reply(payload: MessagePayload) {
  return { type: ResponseType.CHANNEL_MESSAGE, data: { ...payload, flags: EPHEMERAL } };
}

function replyText(content: string) {
  return reply({ content });
}

async function cardNamesOf(env: Env, userId: string) {
  const cards = await listPaymentCards(env.DB, userId);
  return new Map(cards.map((card) => [card.id, card.name]));
}

async function upcoming({ env, user, today }: CommandContext) {
  const [rows, cardNames] = await Promise.all([
    listUserSubscriptionsBetween(env.DB, user.id, today, addDays(today, 7), alertStatuses, {
      autoRenewOnly: true,
    }),
    cardNamesOf(env, user.id),
  ]);
  return reply({
    embeds: [listEmbed("7일 내 결제 예정", rows, "7일 내 결제 예정 구독이 없습니다.", today, cardNames)],
  });
}

async function thisMonth({ env, user, today, waitUntil }: CommandContext) {
  const { start, end } = monthRange(today);
  const [rows, rates, cardNames] = await Promise.all([
    listUserSubscriptionsBetween(env.DB, user.id, start, end, liveStatuses),
    getExchangeRates(env.DB, waitUntil),
    cardNamesOf(env, user.id),
  ]);
  const totals: Record<string, number> = {};
  for (const row of rows) {
    totals[row.currency] = (totals[row.currency] ?? 0) + sharedPrice(row);
  }

  const embed = listEmbed("이번 달 결제 예정", rows, "이번 달 결제 예정 구독이 없습니다.", today, cardNames);
  if (rows.length) {
    const fields = [
      {
        name: "내 부담 총액",
        value: Object.entries(totals)
          .map(([currency, total]) => formatMoney(total, currency))
          .join(" / "),
        inline: false,
      },
    ];
    if (hasForeignCurrency(totals)) {
      fields.push({
        name: "원화 환산",
        value: `약 ${formatMoney(convertTotalsToKrw(totals, rates), "KRW")} (환율 기준일 ${rates.date})`,
        inline: false,
      });
    }
    embed.fields = fields;
  }
  return reply({ embeds: [embed] });
}

async function activeList({ env, user, today }: CommandContext) {
  const [rows, cardNames] = await Promise.all([
    listUserSubscriptionsByStatus(env.DB, user.id, alertStatuses),
    cardNamesOf(env, user.id),
  ]);
  return reply({ embeds: [listEmbed("활성 구독 목록", rows, "활성 구독이 없습니다.", today, cardNames)] });
}

async function status({ env, colo }: CommandContext) {
  const timeZone = timeZoneOf(env);
  let dbHealthy = false;
  try {
    dbHealthy = (await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>())?.ok === 1;
  } catch {
    dbHealthy = false;
  }
  const lastAlert = await getState<string>(env.DB, LAST_ALERT_KEY).catch(() => null);

  const embed: DiscordEmbed = {
    title: "Subscription Manager 상태",
    color: EMBED_COLOR,
    fields: [
      { name: "Worker", value: colo ? `정상 (${colo})` : "정상", inline: true },
      { name: "D1", value: dbHealthy ? "정상" : "오류", inline: true },
      {
        name: "마지막 알림",
        value: formatDateTime(lastAlert?.value, timeZone) ?? "없음",
        inline: false,
      },
    ],
  };
  return reply({ embeds: [embed] });
}

function testAlert({ env, waitUntil }: CommandContext, interaction: Interaction) {
  waitUntil(
    (async () => {
      let content = "테스트 알림을 전송했습니다.";
      try {
        await sendTestAlert(env);
      } catch (error) {
        console.error("Test alert failed", error);
        content = "테스트 알림 전송에 실패했습니다. 봇 권한과 DISCORD_ALERT_CHANNEL_ID를 확인해 주세요.";
      }
      await editOriginalResponse(interaction.application_id, interaction.token, { content });
    })().catch((error) => console.error("Failed to update deferred response", error)),
  );
  return { type: ResponseType.DEFERRED_CHANNEL_MESSAGE, data: { flags: EPHEMERAL } };
}

const handlers: Record<
  CommandName,
  (context: CommandContext, interaction: Interaction) => Promise<object> | object
> = {
  결제임박: upcoming,
  이번달: thisMonth,
  구독목록: activeList,
  상태: status,
  알림테스트: testAlert,
};

function isCommandName(name: string | undefined): name is CommandName {
  return Boolean(name && name in handlers);
}

export async function handleInteraction(c: Context<AppEnv>) {
  const body = await c.req.text();
  const valid = await verifyDiscordSignature({
    publicKey: discordConfig(c.env).publicKey,
    signature: c.req.header("x-signature-ed25519"),
    timestamp: c.req.header("x-signature-timestamp"),
    body,
  });

  if (!valid) {
    return c.text("invalid request signature", 401);
  }

  const interaction = JSON.parse(body) as Interaction;

  if (interaction.type === InteractionType.PING) {
    return c.json({ type: ResponseType.PONG });
  }

  if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
    return c.json(replyText("지원하지 않는 요청입니다."));
  }

  const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
  if (!isAllowedDiscordId(c.env, discordUserId)) {
    return c.json(replyText("이 명령어를 사용할 수 있는 Discord 계정이 아닙니다."));
  }

  const user = discordUserId ? await getUserByDiscordId(c.env.DB, discordUserId) : null;
  if (!user) {
    const loginUrl = new URL("/login", c.req.url).toString();
    return c.json(replyText(`먼저 웹 대시보드에 Discord로 로그인해 주세요: ${loginUrl}`));
  }

  const name = interaction.data?.name;
  if (!isCommandName(name)) {
    return c.json(replyText("알 수 없는 명령어입니다. 설정에서 슬래시 명령어를 다시 등록해 주세요."));
  }

  const context: CommandContext = {
    env: c.env,
    user,
    today: todayIn(timeZoneOf(c.env)),
    waitUntil: (promise) => c.executionCtx.waitUntil(promise),
    colo: (c.req.raw.cf as { colo?: string } | undefined)?.colo,
  };

  return c.json(await handlers[name](context, interaction));
}
