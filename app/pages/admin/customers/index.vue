<script setup lang="ts">
import type { Paginated } from "#shared/schemas/common";
import type { CustomerDTO } from "#shared/types/api";

definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Customers · Admin", robots: "noindex, nofollow" });

const route = useRoute();
const router = useRouter();
const query = computed(() => ({
  q:
    typeof route.query.q === "string" && route.query.q
      ? route.query.q
      : undefined,
  page: Math.max(1, Number(route.query.page) || 1),
  limit: 20,
}));
const { data, error } = await useFetch<Paginated<CustomerDTO>>(
  "/api/admin/customers",
  { query },
);
const { money } = useStore();
const search = ref(query.value.q ?? "");
</script>

<template>
  <div>
    <AdminPageHeader
      title="Customers"
      description="Registered accounts. Guest orders are listed under Orders."
    />
    <form
      role="search"
      class="mb-6 flex"
      @submit.prevent="
        router.push({ query: { q: search.trim() || undefined } })
      "
    >
      <label for="customer-search" class="sr-only">Search customers</label>
      <input
        id="customer-search"
        v-model="search"
        type="search"
        placeholder="Name or email"
        class="field w-72 rounded-r-none"
      />
      <button
        type="submit"
        class="rounded-r-xl bg-cocoa-900 px-4 text-sm text-cream-100"
      >
        Search
      </button>
    </form>

    <AdminNotice v-if="error" tone="error">{{
      apiErrorMessage(error)
    }}</AdminNotice>
    <AdminCard v-else-if="data" class="!p-0">
      <p v-if="!data.items.length" class="p-6 text-sm text-cocoa-500">
        No customers yet.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="table-admin">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Joined</th>
              <th class="text-right">Orders</th>
              <th class="text-right">Order value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in data.items" :key="c.id">
              <td>
                <NuxtLink
                  :to="`/admin/customers/${c.id}`"
                  class="font-semibold hover:text-gold-600"
                  >{{ c.name }}</NuxtLink
                >
                <span class="block text-xs text-cocoa-500">{{ c.email }}</span>
              </td>
              <td>
                {{
                  new Date(c.createdAt).toLocaleDateString("en", {
                    dateStyle: "medium",
                  })
                }}
              </td>
              <td class="text-right">{{ c.orderCount }}</td>
              <td class="text-right">{{ money(c.totalSpent) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminCard>
    <PaginationNav
      v-if="data"
      :page="data.page"
      :total-pages="data.totalPages"
    />
  </div>
</template>
