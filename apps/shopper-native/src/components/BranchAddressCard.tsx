/**
 * BranchAddressCard — read-only two-tier branch location card (NativeWind).
 */

import React, { memo } from "react";
import { Text, View } from "react-native";
import { BRANCH_ADDRESSES, type BranchAddress } from "@/data/branchAddresses";

interface BranchAddressCardProps {
  branch: BranchAddress;
}

export const BranchAddressCard = memo(function BranchAddressCard({
  branch,
}: BranchAddressCardProps) {
  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <Text className="text-right text-base font-bold text-teal-700">
        {branch.title}
      </Text>
      <Text className="mt-1.5 text-right text-sm text-slate-500">
        {branch.address}
      </Text>
    </View>
  );
});

interface BranchAddressListProps {
  branches?: readonly BranchAddress[];
}

export const BranchAddressList = memo(function BranchAddressList({
  branches,
}: BranchAddressListProps) {
  const items = branches ?? BRANCH_ADDRESSES;
  return (
    <View className="gap-0">
      {items.map((b) => (
        <BranchAddressCard key={b.title} branch={b} />
      ))}
    </View>
  );
});
