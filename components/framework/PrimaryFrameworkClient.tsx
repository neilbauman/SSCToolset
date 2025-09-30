// components/framework/PrimaryFrameworkClient.tsx
"use client";

import React from "react";
import VersionManager from "./VersionManager";

/**
 * PrimaryFrameworkClient
 * 
 * Stable client entrypoint for the Primary Framework page.
 * All versioning + editor UI/state lives inside VersionManager.
 */
export default function PrimaryFrameworkClient() {
  return <VersionManager />;
}
