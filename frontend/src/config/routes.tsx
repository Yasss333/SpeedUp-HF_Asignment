import { Navigate, type RouteObject } from "react-router-dom"

export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/dashboard-2" replace /> },
  {
    path: "/dashboard-2",
    lazy: async () => ({
      Component: (await import("@/app/pa-dashboard/page")).default,
    }),
  },
  { path: "/dashboard", element: <Navigate to="/dashboard-2" replace /> },
  { path: "/mail", element: <Navigate to="/dashboard-2" replace /> },
  { path: "*", element: <Navigate to="/dashboard-2" replace /> },
]
