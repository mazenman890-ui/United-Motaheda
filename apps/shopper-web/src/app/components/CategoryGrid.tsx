import { memo } from "react";
import { motion } from "framer-motion";
import type { CatalogCategory } from "../catalog";
import { CategoryCard } from "./CategoryCard";
import { cn } from "./UI";

type CategoryGridProps = {
  categories: CatalogCategory[];
  className?: string;
};

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const CategoryGrid = memo(function CategoryGrid({
  categories,
  className,
}: CategoryGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={cn(
        "catalog-category-grid grid auto-rows-fr gap-3",
        "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
        "2xl:[grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]",
        className,
      )}
    >
      {categories.map((category, index) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </motion.div>
  );
});