import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import UpcomingTrips from "./pages/UpcomingTrips";
import TripDetail from "./pages/TripDetail";
import PastTrips from "./pages/PastTrips";
import EmailFeed from "./pages/EmailFeed";
import Login from "./pages/Login";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <AppLayout><Dashboard /></AppLayout>} />
      <Route path="/upcoming" component={() => <AppLayout><UpcomingTrips /></AppLayout>} />
      <Route path="/trips/:id" component={({ params }) => <AppLayout><TripDetail id={Number(params.id)} /></AppLayout>} />
      <Route path="/past" component={() => <AppLayout><PastTrips /></AppLayout>} />
      <Route path="/emails" component={() => <AppLayout><EmailFeed /></AppLayout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
