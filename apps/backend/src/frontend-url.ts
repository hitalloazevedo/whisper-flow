// FRONTEND_URL includes a path (e.g. https://host/whisper-flow/) since it
// doubles as the OAuth redirect target, but an Origin header never does.
export function frontendOrigin(frontendUrl: string): string {
  return new URL(frontendUrl).origin
}
