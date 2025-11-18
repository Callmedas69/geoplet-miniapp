"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { UnconvertedUser } from "@/lib/supabase";

interface UserGridProps {
  users: UnconvertedUser[];
  selectedFids: Set<number>;
  onToggleUser: (fid: number) => void;
  onToggleAll: () => void;
}

export function UserGrid({ users, selectedFids, onToggleUser, onToggleAll }: UserGridProps) {
  const allSelected = users.length > 0 && users.every(u => selectedFids.has(u.fid));
  const someSelected = users.some(u => selectedFids.has(u.fid)) && !allSelected;

  if (users.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No users found for the selected filter.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Select All Header */}
      <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          aria-label="Select all users"
          className={someSelected ? "data-[state=checked]:bg-orange-500" : ""}
        />
        <label className="text-sm font-medium cursor-pointer" onClick={onToggleAll}>
          Select All ({selectedFids.size} of {users.length} selected)
        </label>
      </div>

      {/* User Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => {
          const isSelected = selectedFids.has(user.fid);
          const generatedDate = new Date(user.generated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <Card
              key={user.fid}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => onToggleUser(user.fid)}
            >
              <div className="flex items-start space-x-3">
                {/* Checkbox */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleUser(user.fid)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${user.username}`}
                />

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  {/* Header: Avatar + Username */}
                  <div className="flex items-center space-x-2 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={`data:image/png;base64,${user.image_data}`}
                        alt={user.username || `fid-${user.fid}`}
                      />
                      <AvatarFallback>{(user.username || 'UN').slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">@{user.username || `fid-${user.fid}`}</p>
                      <p className="text-xs text-muted-foreground">FID: {user.fid}</p>
                    </div>
                  </div>

                  {/* Image Preview */}
                  <div className="mb-2 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={`data:image/png;base64,${user.image_data}`}
                      alt={`Geoplet for ${user.username}`}
                      className="w-full h-auto"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Generated: {generatedDate}
                    </span>
                    {user.cast_sent && (
                      <Badge variant="secondary" className="text-xs">
                        Contacted
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
