import { apiSlice } from "./apiSlice";
import { CATEGORY_URL } from "../constants";

export const categoryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createCategory: builder.mutation({
      query: ({ name, token }) => ({
        url: `${CATEGORY_URL}`,
        method: "POST",
        body: { name },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    updateCategory: builder.mutation({
      query: ({ categoryId, updatedCategory, token }) => ({
        url: `${CATEGORY_URL}/${categoryId}`,
        method: "PUT",
        body: updatedCategory,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    deleteCategory: builder.mutation({
      query: ({ categoryId, token }) => ({
        url: `${CATEGORY_URL}/${categoryId}`,
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    }),

    fetchCategories: builder.query({
      query: () => `${CATEGORY_URL}/categories`,
    }),
  }),
});

export const {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useFetchCategoriesQuery,
} = categoryApiSlice;