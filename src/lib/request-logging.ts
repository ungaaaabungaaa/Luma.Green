/** Next dev prints full request URLs. Exclude credential and private-link paths. */
export const privateRequestLogPatterns = [
  /\/api\/auth(?:[/?]|$)/i,
  /\/(?:login|account|admin)(?:[/?]|$)/i,
  /\/t\/[^/?]+/i,
  /[?&](?:token|code|next|callbackURL)=/i,
];
