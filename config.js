// Verejna konfiguracia klienta. Neobsahuje databazovy connection string ani API kluc.
// Hodnoty skopiruj z Neon Console pre production branch (Connect > Web / Data API).
window.CIGAPP_CONFIG = Object.freeze({
  neonAuthUrl: "https://ep-long-dawn-b150ppsj.neonauth.c-5.eu-central-1.aws.neon.tech/neondb/auth",
  neonDataApiUrl: "https://ep-long-dawn-b150ppsj.apirest.c-5.eu-central-1.aws.neon.tech/neondb/rest/v1",
});
