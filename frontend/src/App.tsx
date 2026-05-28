import {
  NavLink,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { ExamsListPage } from "./pages/ExamsListPage";
import { ExamPage } from "./pages/ExamPage";
import { ReviewPage } from "./pages/ReviewPage";
import {
  WrongQuestionsCertPage,
  WrongQuestionsChooserPage,
} from "./pages/WrongQuestionsPage";
import { HistoryPage } from "./pages/HistoryPage";

function Nav() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium rounded-md ${
      isActive
        ? "bg-slate-900 text-white"
        : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
    }`;

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
        <span className="mr-4 text-sm font-semibold text-slate-900">AWS Cert Practice</span>
        <NavLink to="/" end className={tabClass}>
          Exams
        </NavLink>
        <NavLink to="/wrong" className={tabClass}>
          Wrong questions
        </NavLink>
        <NavLink to="/history" className={tabClass}>
          History
        </NavLink>
      </div>
    </nav>
  );
}

function Layout() {
  return (
    <>
      <Nav />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <ExamsListPage /> },
      { path: "/exam/:certId/:version", element: <ExamPage /> },
      { path: "/review/:attemptId", element: <ReviewPage /> },
      { path: "/wrong", element: <WrongQuestionsChooserPage /> },
      { path: "/wrong/:certId", element: <WrongQuestionsCertPage /> },
      { path: "/history", element: <HistoryPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
