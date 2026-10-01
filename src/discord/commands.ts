// Slash commands registered via Settings → "슬래시 명령어 등록" (PUT replaces the full set).
export const commandDefinitions = [
  { type: 1, name: "결제임박", description: "7일 내 결제 예정 구독 목록을 보여줍니다." },
  { type: 1, name: "이번달", description: "이번 달 결제 예정 구독과 내 부담 총액을 보여줍니다." },
  { type: 1, name: "구독목록", description: "활성 또는 체험 중인 구독 목록을 보여줍니다." },
  { type: 1, name: "상태", description: "Worker와 D1 상태, 마지막 알림 시간을 보여줍니다." },
  { type: 1, name: "알림테스트", description: "지정된 알림 채널에 테스트 메시지를 보냅니다." },
] as const;

export type CommandName = (typeof commandDefinitions)[number]["name"];
