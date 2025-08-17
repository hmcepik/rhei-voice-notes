import { useState } from "react";
import { Button } from "@/components/ui/button";
import { History, Mic } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const RHEIHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHistoryPage = location.pathname === "/history";

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rhei-primary to-rhei-primary-light flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">RHEI Voice Notes</h1>
              <p className="text-sm text-muted-foreground">Capture ideas at the speed of thought</p>
            </div>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={isHistoryPage ? "default" : "default"}
              size="sm"
              onClick={() => navigate(isHistoryPage ? "/" : "/history")}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isHistoryPage ? <Mic className="w-4 h-4" /> : <History className="w-4 h-4" />}
              <span>{isHistoryPage ? "Record" : "History"}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default RHEIHeader;