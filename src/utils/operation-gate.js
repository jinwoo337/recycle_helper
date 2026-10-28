// 중복 저장과 화면을 떠난 뒤 도착한 응답으로부터 현재 작업을 보호합니다.
export function createOperationGate() {
  let current = null, disposed = false;
  return {
    begin() {
      if (current || disposed) return null;
      const operation = {
        active: () => !disposed && current === operation,
        finish() { if (current === operation) current = null; },
      };
      current = operation;
      return operation;
    },
    cancel() { current = null; },
    dispose() { current = null; disposed = true; },
  };
}
