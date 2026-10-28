export const ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
  },
  shops: {
    update: "/api/shops/update",
  },
  pricingRules: {
    upsert: "/api/pricing-rules/upsert",
  },
  products: {
    list: "/api/products",
    byId: (id: string) => `/api/products/${id}`,
  },
  team: {
    invite: "/api/team/invite",
    byId: (id: string) => `/api/team/${id}`,
  },
  expenses: {
    list: "/api/expenses",
    byId: (id: string) => `/api/expenses/${id}`,
  },
  stations: {
    list: "/api/stations/list",
    updateName: "/api/stations/update-name",
  },
  shifts: {
    current: "/api/shifts/current",
    open: "/api/shifts/open",
    close: "/api/shifts/close",
  },
  sessions: {
    start: "/api/sessions/start",
    active: "/api/sessions/active",
    previewClose: "/api/sessions/preview-close",
    confirmClose: "/api/sessions/confirm-close",
    addProduct: "/api/sessions/add-product",
    removeProduct: "/api/sessions/remove-product",
    updateGames: "/api/sessions/update-games",
    addGameEntry: "/api/sessions/add-game-entry",
    removeGameEntry: "/api/sessions/remove-game-entry",
    gameEntries: "/api/sessions/game-entries",
    saleItems: "/api/sessions/sale-items",
    addStationGameEntry: "/api/sessions/add-station-game-entry",
    removeStationGameEntry: "/api/sessions/remove-station-game-entry",
    stationGameEntries: "/api/sessions/station-game-entries",
  },
} as const;
