<script setup lang="ts">
const { $schemakit } = useNuxtApp();

type User = { id: string | number; email: string; name?: string };

const { data, pending, error, refresh } = await useAsyncData('users', async () => {
  const res = await $schemakit.entity<User>('User').list({ page: 1, limit: 10 });
  return res.data ?? [];
});

const email = ref('');
const name = ref('');

async function createUser() {
  await $schemakit.entity<User>('User').create({ email: email.value, name: name.value });
  email.value = '';
  name.value = '';
  await refresh();
}
</script>

<template>
  <div>
    <p v-if="pending">Loading...</p>
    <p v-else-if="error">Error: {{ (error as any)?.message }}</p>

    <form @submit.prevent="createUser" style="margin-bottom: 16px">
      <input v-model="email" placeholder="Email" />
      <input v-model="name" placeholder="Name" />
      <button type="submit">Create</button>
    </form>

    <ul>
      <li v-for="u in data" :key="u.id">
        {{ u.email }} <span v-if="u.name">— {{ u.name }}</span>
      </li>
    </ul>
  </div>
  
</template>
