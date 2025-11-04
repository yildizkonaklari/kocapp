import StudentDetail from "./pages/StudentDetail";

<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/students" element={<Students />} />
  <Route path="/students/:id" element={<StudentDetail />} />
  <Route path="*" element={<Navigate to="/" />} />
</Routes>
