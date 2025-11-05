/**
 * useGenerationStorage Hook
 *
 * Manages saving/loading/deleting generated images to/from Supabase
 * Ensures persistence of unminted generations across sessions
 */

"use client";

import { useState, useCallback } from "react";

export function useGenerationStorage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Save generation to Supabase
  const saveGeneration = useCallback(
    async (fid: number, imageData: string): Promise<boolean> => {
      if (!fid || !imageData) {
        console.error("Missing FID or image data");
        return false;
      }

      setIsSaving(true);
      try {
        const response = await fetch("/api/save-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid, image_data: imageData }),
        });

        const data = await response.json();

        if (!data.success) {
          console.error("Failed to save generation:", data.error);
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error saving generation:", error);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Load generation from Supabase
  const loadGeneration = useCallback(
    async (fid: number): Promise<string | null> => {
      if (!fid) {
        console.error("Missing FID");
        return null;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/get-generation?fid=${fid}`);
        const data = await response.json();

        if (!data.success) {
          console.error("Failed to load generation:", data.error);
          return null;
        }

        return data.data?.image_data || null;
      } catch (error) {
        console.error("Error loading generation:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Delete generation from Supabase
  const deleteGeneration = useCallback(
    async (fid: number): Promise<boolean> => {
      if (!fid) {
        console.error("Missing FID");
        return false;
      }

      setIsDeleting(true);
      try {
        const response = await fetch(`/api/delete-generation?fid=${fid}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (!data.success) {
          console.error("Failed to delete generation:", data.error);
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error deleting generation:", error);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    []
  );

  return {
    saveGeneration,
    loadGeneration,
    deleteGeneration,
    isSaving,
    isLoading,
    isDeleting,
  };
}
