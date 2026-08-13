"use client";

import { useState } from "react";
import { PackageCard, type PackageCardData } from "@/components/member/packages/package-card";
import { PackagePaymentSheet } from "@/components/member/packages/package-payment-sheet";

/**
 * Master-Detail package storefront: the grid ("master") just tracks which
 * package is selected, and a single `<PackagePaymentSheet>` ("detail") drawer
 * stays open for as long as any card is selected.
 */
export function PackageStore({ packages }: { packages: PackageCardData[] }) {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const selectedPackage =
    packages.find((pkg) => pkg.id === selectedPackageId) ?? null;

  return (
    <>
      <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            selected={pkg.id === selectedPackageId}
            onSelect={() => setSelectedPackageId(pkg.id)}
          />
        ))}
      </div>

      <PackagePaymentSheet
        pkg={selectedPackage}
        open={selectedPackageId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPackageId(null);
        }}
      />
    </>
  );
}
