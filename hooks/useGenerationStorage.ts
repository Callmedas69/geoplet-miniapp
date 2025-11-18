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
    async (fid: number, imageData: string, username: string): Promise<boolean> => {
      // Enhanced validation logging
      console.log('[SAVE-GEN] Starting save:', {
        fid,
        fidType: typeof fid,
        username,
        imageDataLength: imageData?.length,
        imageDataPrefix: imageData?.substring(0, 50),
        timestamp: new Date().toISOString()
      });

      if (!fid || !imageData || !username) {
        console.error("[SAVE-GEN] ❌ Validation failed:", {
          fid,
          fidType: typeof fid,
          hasImageData: !!imageData,
          hasUsername: !!username
        });
        return false;
      }

      // Calculate image size (base64 decoded)
      const base64Data = imageData.split(',')[1] || imageData;
      const sizeInBytes = Buffer.from(base64Data, 'base64').length;
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);

      console.log('[SAVE-GEN] Image size:', {
        fid,
        sizeInBytes,
        sizeInKB: `${sizeInKB} KB`,
        isWithinLimit: sizeInBytes <= 24576
      });

      setIsSaving(true);
      try {
        const response = await fetch("/api/save-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid, image_data: imageData, username }),
        });

        const data = await response.json();

        // Enhanced response logging
        console.log('[SAVE-GEN] API Response:', {
          status: response.status,
          success: data.success,
          error: data.error,
          fid
        });

        if (!data.success) {
          console.error("[SAVE-GEN] ❌ Save failed:", {
            fid,
            error: data.error,
            status: response.status,
            sizeInKB
          });
          return false;
        }

        console.log('[SAVE-GEN] ✅ Save successful:', { fid });
        return true;
      } catch (error) {
        console.error("[SAVE-GEN] ❌ Exception:", {
          fid,
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
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
