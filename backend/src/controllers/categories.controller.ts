// Categories controller — validates the /:id param and delegates to the service.
import type { Request, Response } from "express";
import {
  createCategoriesService,
  parseCategoryId,
  type CategoryPrisma,
} from "../services/categories.service.js";
import { parsePagination } from "../utils/pagination.js";
import { handleServiceResponse } from "../utils/serviceResponse.js";

export function createCategoriesController(prisma: CategoryPrisma) {
  const categoriesService = createCategoriesService(prisma);

  return {
    async listCategories(req: Request, res: Response) {
      const pagination = parsePagination(req.query as Record<string, unknown>);

      if ("error" in pagination) {
        res.status(400).json({ error: pagination.error });
        return;
      }

      const result = await categoriesService.listCategories(pagination.value);
      res.json(result);
    },

    async createCategory(req: Request, res: Response) {
      const result = await categoriesService.createCategory(req.body);
      handleServiceResponse(res, result, 201);
    },

    async updateCategory(req: Request, res: Response) {
      const categoryId = parseCategoryId(req.params.id);

      if (!categoryId) {
        res.status(400).json({ error: "invalid category id" });
        return;
      }

      const result = await categoriesService.updateCategory(
        categoryId,
        req.body,
      );
      handleServiceResponse(res, result);
    },

    async deleteCategory(req: Request, res: Response) {
      const categoryId = parseCategoryId(req.params.id);

      if (!categoryId) {
        res.status(400).json({ error: "invalid category id" });
        return;
      }

      const result = await categoriesService.deleteCategory(categoryId);
      handleServiceResponse(res, result);
    },
  };
}
