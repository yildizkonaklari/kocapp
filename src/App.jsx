import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-gray-100 min-h-screen">
        <Navbar />
        <Dashboard />
      </div>
    </div>
  );
}
