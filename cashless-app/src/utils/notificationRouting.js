const ROUTE_ALIASES = {
  notifications: "Notifications",
  notification: "Notifications",
  profile: "Profile",
  verificationstatus: "Profile",
  verification_status: "Profile",
  verifystatus: "Profile",
  businessverification: "BusinessVerification",
  business_verification: "BusinessVerification",
  transaction: "Transactions",
  transactions: "Transactions",
  transactiondetails: "TransactionDetails",
  friendsmap: "FriendsMap",
  friendmap: "FriendsMap",
  addfriend: "AddFriend",
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function compactText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function matchesAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword));
}

function resolveExplicitRoute(payload = {}) {
  const candidates = [payload.route, payload.screen, payload.target];
  for (const candidate of candidates) {
    const normalized = compactText(candidate);
    if (!normalized) continue;
    if (ROUTE_ALIASES[normalized]) return ROUTE_ALIASES[normalized];
    if (candidate === "VerificationStatus") return "Profile";
  }
  return null;
}

export function normalizeNotificationPayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  return {
    title: String(p.title || "Notification"),
    body: String(p.body || ""),
    type: String(p.type || "system"),
    action: String(p.action || p.event || ""),
    target: String(p.target || p.screen || p.route || ""),
    friendId: p.friend_id || p.sender_id || p.user_id || null,
  };
}

export function resolveNotificationDestination(payload = {}, availableRoutes = [], options = {}) {
  const p = normalizeNotificationPayload(payload);
  const lowerTitle = normalizeText(p.title);
  const lowerBody = normalizeText(p.body);
  const lowerType = normalizeText(p.type);
  const lowerAction = normalizeText(p.action);
  const compactTarget = compactText(p.target);
  const compactAction = compactText(p.action);
  const fallbackRouteName = options.fallbackRouteName || "Transactions";

  const hasRoute = (routeName) => !availableRoutes.length || availableRoutes.includes(routeName);
  const choose = (routeName, params = undefined) => (hasRoute(routeName) ? { routeName, params } : null);

  const explicitRoute = resolveExplicitRoute(p);
  if (explicitRoute) {
    const route = choose(explicitRoute, explicitRoute === "FriendsMap" || explicitRoute === "AddFriend" ? { friendId: p.friendId } : undefined);
    if (route) return route;
  }

  const isFriendOnline =
    matchesAny(lowerType, ["friend", "online"]) ||
    matchesAny(lowerTitle, ["friend", "online"]) ||
    matchesAny(lowerBody, ["friend", "online"]) ||
    compactAction === "friendonline" ||
    compactTarget === "friendsonline";

  if (isFriendOnline && p.friendId) {
    return choose("FriendsMap", { friendId: p.friendId });
  }

  const isFriendRequest =
    matchesAny(lowerType, ["friend", "request"]) ||
    matchesAny(lowerTitle, ["friend", "request"]) ||
    matchesAny(lowerBody, ["friend", "request"]) ||
    compactAction === "friendrequest" ||
    compactTarget.includes("friend");

  if (isFriendRequest) {
    return choose("AddFriend", { focusIncoming: true, friendId: p.friendId });
  }

  const isBusinessVerification =
    matchesAny(lowerType, ["business", "verification"]) ||
    matchesAny(lowerTitle, ["business", "verification"]) ||
    matchesAny(lowerBody, ["business", "verification"]) ||
    matchesAny(lowerAction, ["business", "verification"]);

  if (isBusinessVerification) {
    return choose("BusinessVerification");
  }

  const isUserVerification =
    matchesAny(lowerType, ["verification", "verified", "approved", "rejected", "identity", "passenger", "discount"]) ||
    matchesAny(lowerTitle, ["verification", "verified", "approved", "rejected", "identity", "passenger", "discount"]) ||
    matchesAny(lowerBody, ["verification", "verified", "approved", "rejected", "identity", "passenger", "discount"]) ||
    matchesAny(lowerAction, ["verification", "verified", "approved", "rejected", "identity", "passenger", "discount"]);

  if (isUserVerification) {
    return choose("Profile");
  }

  const isSecurityOrAccount =
    matchesAny(lowerType, ["security", "account", "pin", "mpin", "password"]) ||
    matchesAny(lowerTitle, ["security", "account", "pin", "mpin", "password"]) ||
    matchesAny(lowerBody, ["security", "account", "pin", "mpin", "password"]);

  if (isSecurityOrAccount) {
    return choose("Profile");
  }

  const isTransaction =
    matchesAny(lowerType, ["transfer", "payment", "topup", "top-up", "cash", "ride", "fare", "send", "load", "wallet", "transaction"]) ||
    matchesAny(lowerTitle, ["transfer", "payment", "top-up", "top up", "cash", "ride", "fare", "send", "load", "wallet", "transaction"]) ||
    matchesAny(lowerBody, ["transfer", "payment", "top-up", "top up", "cash", "ride", "fare", "send", "load", "wallet", "transaction"]);

  if (isTransaction) {
    return choose("Transactions");
  }

  if (availableRoutes.includes("Notifications") || fallbackRouteName === "Notifications") {
    return { routeName: "Notifications" };
  }

  return { routeName: fallbackRouteName };
}
