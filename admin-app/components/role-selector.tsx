"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Building2, Cpu, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserRole = "model_supplier" | "company_user" | null;

interface RoleSelectorProps {
  onRoleSelect: (role: UserRole) => void;
  currentRole?: UserRole;
}

export function RoleSelector({ onRoleSelect, currentRole }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole || null);

  const handleSelect = (role: UserRole) => {
    setSelectedRole(role);
    onRoleSelect(role);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold mb-2">Select Your Role</h2>
        <p className="text-muted-foreground">Choose how you want to use the platform</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary",
            selectedRole === "model_supplier" && "border-primary border-2"
          )}
          onClick={() => handleSelect("model_supplier")}
        >
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="h-6 w-6 text-primary" />
              <CardTitle>Model Supplier</CardTitle>
            </div>
            <CardDescription>
              Upload and manage AI models on the platform. Earn rewards when your models are used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRole === "model_supplier" && (
              <div className="flex items-center gap-2 text-primary">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Selected</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary",
            selectedRole === "company_user" && "border-primary border-2"
          )}
          onClick={() => handleSelect("company_user")}
        >
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <CardTitle>Company User</CardTitle>
            </div>
            <CardDescription>
              Use AI to find target customers and deploy marketing campaigns with coupons and promotions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRole === "company_user" && (
              <div className="flex items-center gap-2 text-primary">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Selected</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {selectedRole && (
        <Button
          onClick={() => onRoleSelect(selectedRole)}
          className="w-full mt-4"
          size="lg"
        >
          Continue as {selectedRole === "model_supplier" ? "Model Supplier" : "Company User"}
        </Button>
      )}
    </div>
  );
}

