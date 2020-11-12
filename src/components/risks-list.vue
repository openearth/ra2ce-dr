<template>
  <div>
    <h2 class="pb-4">
      Riesgos
    </h2>
    <ul
      v-if="risks.length"
      class="risks-list"
    >
      <li
        class="risks-list__item"
        v-for="risk in risks"
        :key="risk.id"
      >
        <v-btn text icon @click.stop="$emit('updateVisibility', risk.id)">
          <v-icon>{{ risk.visible ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
        </v-btn>
        <v-btn text icon @click.stop="$emit('updateLegend', risk.layer)">
          <v-icon>{{ risk.layer === activeLegendLayer ? 'mdi-card-bulleted' : 'mdi-card-bulleted-off' }}</v-icon>
        </v-btn>
        <span class="risks-list__item-title">
          {{ risk.title }}
        </span>
      </li>
    </ul>

    <p v-else>Select a hazard to get risks</p>
  </div>
</template>

<script>
export default {
  props: {
    risks: {
      type: Array,
      required: true
    },
    activeLegendLayer: {
      type: String,
      required: true
    }
  },
};
</script>

<style>
  .risks-list {
    padding: 0 !important;
    list-style: none outside none;
    border-top: thin solid #eee;
  }

  .risks-list__item {
    padding: .5rem 0;
    border-bottom: thin solid #eee;
  }

  .risks-list__item-title {
    text-transform: capitalize;
  }
</style>
