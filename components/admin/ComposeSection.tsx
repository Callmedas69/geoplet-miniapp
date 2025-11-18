"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ComposeSectionProps {
  selectedUsernames: string[];
  selectedFids: number[];
  onSendSuccess: () => void;
}

const MESSAGE_TEMPLATES = {
  friendly:
    "your Geoplet is doing a little happy dance… mint it whenever you wanna join in 💃✨", // Preview only - will cycle through variations
  urgent:
    "Don't miss out! Your Geoplet is waiting to be minted. Claim it now! 🎨",
  reminder: "Your generated Geoplet is ready to mint! 🖼️",
  custom: "",
};

export function ComposeSection({
  selectedUsernames,
  selectedFids,
  onSendSuccess,
}: ComposeSectionProps) {
  const [template, setTemplate] = useState<string>("friendly");
  const [message, setMessage] = useState(MESSAGE_TEMPLATES.friendly);
  const [isSending, setIsSending] = useState(false);

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    if (value !== "custom") {
      setMessage(MESSAGE_TEMPLATES[value as keyof typeof MESSAGE_TEMPLATES]);
    }
  };

  const handleSendCast = async () => {
    if (selectedFids.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/admin/send-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fids: selectedFids,
          message: message.trim(),
          template: template, // Pass template type for variation cycling
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || "Failed to send cast");
        return;
      }

      // Show detailed results
      const { summary } = data;
      if (summary.failed > 0) {
        toast.success(
          `Sent ${summary.successful} casts successfully. ${summary.failed} failed.`
        );
      } else {
        toast.success(`Successfully sent ${summary.successful} cast(s)!`);
      }

      setMessage(
        MESSAGE_TEMPLATES[template as keyof typeof MESSAGE_TEMPLATES] || ""
      );
      onSendSuccess();
    } catch (error) {
      console.error("Error sending cast:", error);
      toast.error("Failed to send cast. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Individual cast format: "Hey! @username {message}"
  // Preview shows example for first selected user
  const previewUsername = selectedUsernames[0] || "username";
  const fullMessage = message.trim()
    ? `Hey! @${previewUsername} ${message}`
    : `Hey! @${previewUsername}`;
  const charCount = fullMessage.length;
  const maxChars = 320; // Farcaster limit

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Compose Cast</h3>

      {/* Template Selector */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block">
          Message Template
        </label>
        <Select value={template} onValueChange={handleTemplateChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="friendly">Friendly Reminder (varies per user)</SelectItem>
            <SelectItem value="urgent">Urgent Call-to-Action</SelectItem>
            <SelectItem value="reminder">Simple Reminder</SelectItem>
            <SelectItem value="custom">Custom Message</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Message Composer */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block">Message</label>
        <Textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (template !== "custom") setTemplate("custom");
          }}
          placeholder="Type your message..."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Preview */}
      {selectedUsernames.length > 0 && (
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            Preview{template === "friendly" ? " (message will vary per user)" : " (Individual Cast)"}
          </label>
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="whitespace-pre-wrap">{fullMessage}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <Badge variant={charCount > maxChars ? "destructive" : "secondary"}>
              {charCount} / {maxChars} characters
            </Badge>
            <p className="text-xs text-muted-foreground">
              {selectedUsernames.length} individual cast(s) with personalized
              images
            </p>
          </div>
          {charCount > maxChars && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>
                Message exceeds {maxChars} character limit. Please shorten your
                message.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Send Button */}
      <Button
        onClick={handleSendCast}
        disabled={
          isSending || selectedFids.length === 0 || charCount > maxChars
        }
        className="w-full"
        size="lg"
      >
        {isSending
          ? "Sending..."
          : `Send Cast to ${selectedFids.length} User(s)`}
      </Button>

      {selectedFids.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          Select users above to compose a cast
        </p>
      )}
    </Card>
  );
}
