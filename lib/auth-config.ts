const productionURL = "https://edts-apm.adihnursyam.com";

export function authURLs(configuredURL: string, production: boolean) {
  const configured = new URL(configuredURL);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname);
  const baseURL = production && local ? productionURL : configured.origin;
  return { baseURL, trustedOrigins: [...new Set([baseURL, productionURL])] };
}
