const ADMIN_EMAIL = "marshallfoong96@gmail.com";

export function isAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

export { ADMIN_EMAIL };
