"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnect, useDisconnect } from "wagmi";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { StatsCards } from "@/components/admin/StatsCards";
import { UserGrid } from "@/components/admin/UserGrid";
import { ComposeSection } from "@/components/admin/ComposeSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { UnconvertedUser } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { isOwner, isLoading: isLoadingAuth, address } = useAdminAuth();

  const [users, setUsers] = useState<UnconvertedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "not_contacted" | "contacted">("not_contacted");
  const [selectedFids, setSelectedFids] = useState<Set<number>>(new Set());
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);

  // Monitor connection changes
  useEffect(() => {
    if (address) {
      console.log('[ADMIN] Wallet connected:', address);
      toast.success('Wallet connected successfully');
    }
  }, [address]);

  // Handle connect wallet
  const handleConnect = async () => {
    console.log('[ADMIN] Connect button clicked');
    console.log('[ADMIN] Available connectors:', connectors);

    if (connectors.length === 0) {
      console.error('[ADMIN] No connectors available');
      toast.error('No wallet connector available');
      return;
    }

    // Use injected wallet (Rabby/MetaMask) if available, fallback to Farcaster
    const preferredConnector = connectors.find(c => c.type === 'injected') || connectors[0];

    try {
      console.log('[ADMIN] Attempting to connect with connector:', preferredConnector);
      const result = await connect({ connector: preferredConnector });
      console.log('[ADMIN] Connection result:', result);
    } catch (error) {
      console.error('[ADMIN] Connect error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  // Fetch unconverted users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const castSentParam = filter === "all" ? "" : `?cast_sent=${filter === "contacted"}`;
      const response = await fetch(`/api/analytics/unconverted${castSentParam}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchUsers();
    }
  }, [isOwner, filter]);

  // Selection handlers
  const handleToggleUser = (fid: number) => {
    const newSelected = new Set(selectedFids);
    if (newSelected.has(fid)) {
      newSelected.delete(fid);
    } else {
      newSelected.add(fid);
    }
    setSelectedFids(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedFids.size === users.length && users.length > 0) {
      setSelectedFids(new Set());
    } else {
      setSelectedFids(new Set(users.map(u => u.fid)));
    }
  };

  const handleSendSuccess = () => {
    setSelectedFids(new Set());
    fetchUsers(); // Refresh the list
  };

  // Test Farcaster API Key
  const handleTestApiKey = async () => {
    setIsTestingApiKey(true);
    try {
      const response = await fetch("/api/admin/test-farcaster-key");
      const data = await response.json();

      if (data.success) {
        toast.success(
          `✅ API Key Valid!\nAccount: @${data.account.username} (FID: ${data.account.fid})`,
          { duration: 5000 }
        );
      } else {
        toast.error(
          `❌ API Key Invalid\n${data.error}\n${data.details || ""}`,
          { duration: 7000 }
        );
      }
    } catch (error) {
      console.error("Error testing API key:", error);
      toast.error("Failed to test API key. Check console for details.");
    } finally {
      setIsTestingApiKey(false);
    }
  };

  // Calculate stats
  const allUsers = users;
  const contacted = users.filter(u => u.cast_sent);
  const pending = users.filter(u => !u.cast_sent);

  const selectedUsernames = users
    .filter(u => selectedFids.has(u.fid))
    .map(u => u.username);

  // State 1: Not Connected - Show Connect Button
  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to access admin features
          </p>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            size="lg"
            className="w-full"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Only contract owner can access this dashboard
          </p>
        </Card>
      </div>
    );
  }

  // State 2: Checking Auth - Show Loading
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <p className="text-muted-foreground">Verifying owner access...</p>
        </Card>
      </div>
    );
  }

  // State 3: Connected but Not Owner - Show Access Denied
  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              Only the contract owner can access the admin dashboard.
            </AlertDescription>
          </Alert>
          <div className="space-y-2 mb-6">
            <p className="text-sm text-muted-foreground">Connected as:</p>
            <p className="text-xs font-mono bg-muted p-2 rounded">
              {address}
            </p>
          </div>
          <Button
            onClick={() => disconnect()}
            variant="outline"
            className="w-full"
          >
            Disconnect Wallet
          </Button>
        </Card>
      </div>
    );
  }

  // State 4: Connected and Is Owner - Show Admin Dashboard

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage unconverted users and send Farcaster casts
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Connected as: {address}
            </p>
          </div>
          <Button
            onClick={handleTestApiKey}
            disabled={isTestingApiKey}
            variant="outline"
            size="sm"
          >
            {isTestingApiKey ? "Testing..." : "Test API Key"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalUnconverted={allUsers.length}
        contacted={contacted.length}
        pending={pending.length}
      />

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
          <TabsTrigger value="not_contacted">
            Not Contacted ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="contacted">
            Contacted ({contacted.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allUsers.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Grid - Takes 2 columns */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : (
            <UserGrid
              users={users}
              selectedFids={selectedFids}
              onToggleUser={handleToggleUser}
              onToggleAll={handleToggleAll}
            />
          )}
        </div>

        {/* Compose Section - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <ComposeSection
              selectedUsernames={selectedUsernames}
              selectedFids={Array.from(selectedFids)}
              onSendSuccess={handleSendSuccess}
            />

            {/* Info Alert */}
            <Alert className="mt-4">
              <AlertDescription className="text-xs">
                💡 Select users from the list and compose a cast to send. Users will be automatically marked as contacted after sending.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>
    </div>
  );
}
