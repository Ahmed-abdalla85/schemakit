<script setup lang="ts">

const { $schemakit } = useNuxtApp();

const records = ref([]);
const meta = ref(null);
const pending = ref(true);
const error = ref(null);


onMounted(async () => {
  const entities = $schemakit.entity('entities');
  const {data,meta} = await entities.list();
  records.value = data;
  meta.value = meta;
  pending.value = false;
}); 

</script>

<template>
  <div>
    <p v-if="pending">Loading...</p>
    <p v-else-if="error">Error: {{ error?.message }}</p>
    <div v-else>
      <p>Meta: {{ meta }}</p>
      <ul>
        <li v-for="u in records" :key="u.id">
          {{ u.entity_name }} <span v-if="u.entity_description">— {{ u.entity_table_name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
