<template>
  <div class="fill-height d-flex flex-column">
    <div>
      <v-select
        v-model="selectedHazard"
        :items="hazardList"
        item-value="layer_name"
        item-text="name"
        label="Amenaza"
        :disabled="!hazardList.length || loadingCapabilities"
      ></v-select>

      <risks-list
        :risks="risks"
        :activeLegendLayer="legendLayer || ''"
        @updateVisibility="onVisibilityChange"
        @updateLegend="onLegendChange"
        class="mb-8"
      />
    </div>

    <v-spacer />

    <priority-matrix
      :edge-size="edgeSize"
      :priorities="priorities"
      @updateMatrix="updatePriorities"
      @reset="restart"
      :disabled="!risks.length"
    />
    <div class="mt-4 d-flex align-center">
      <v-switch
        label="Live Update"
        v-model="liveUpdate"
        :disabled="!risks.length"
      ></v-switch>
      <v-spacer />
      <v-btn
        :disabled="!risks.length || liveUpdate"
        @click="calculatePrioritiesMap"
        color="primary"
      >
        RA2CE!
      </v-btn>
    </div>

    <portal to="notifications">
      <v-snackbar v-model="showGetPrioritiesMessage" top>{{ getPrioritiesMessage }}</v-snackbar>
      <v-snackbar v-model="showGetPrioritiesError" top color="error" :timeout="3000">{{ getPrioritiesError }}</v-snackbar>
    </portal>
  </div>
</template>

<script>
import axios from 'axios';
import debounce from 'lodash.debounce';
import parser from 'fast-xml-parser';
import wps from '@/lib/wps';
import buildWmsLayer from '@/lib/build-wms-layer';
import RisksList from '@/components/risks-list';
import PriorityMatrix from '@/components/priority-matrix';

export default {
  components: {
    RisksList,
    PriorityMatrix,
  },

  data: () => ({
    hazardList: [],
    selectedHazard: '',
    liveUpdate: false,
    getPrioritiesMessage: null,
    getPrioritiesError: null,
    loadingCapabilities: true,
    layersInfo: []
  }),

  computed: {
    wmsLayers() {
      return this.$store.getters['mapbox/wmsLayers'];
    },
    risks() {
      return this.$store.getters['mapbox/layersWithVisibility'];
    },
    legendLayer() {
      return this.$store.getters['mapbox/legendLayer'];
    },
    edgeSize() {
      return this.$store.getters['priorities/edgeSize'];
    },
    priorities() {
      return this.$store.getters['priorities/priorities'];
    },
    prioritiesMatrix() {
      return this.$store.getters['priorities/prioritiesMatrix'];
    },
    showGetPrioritiesMessage() {
      return Boolean(this.getPrioritiesMessage);
    },
    showGetPrioritiesError() {
      return Boolean(this.getPrioritiesError);
    }
  },

  watch: {
    liveUpdate(newVal) {
      if(newVal) this.calculatePrioritiesMap();
    },

    selectedHazard(hazard) {
      const map = this.$root.map;

      // 1. Remove all existing layers
      this.wmsLayers.forEach(({ id }) => {
        this.$store.commit('mapbox/REMOVE_WMS_LAYER', id);
      });

      // 2. Hide legend
      this.$store.commit('mapbox/SET_LEGEND_LAYER', null);

      // 3. Add new layers for operator and societal costs
      [
        {
          id: `${ hazard }_herstelkosten`,
          layer: `ra2ce:${ hazard }_herstelkosten`,
        },
        {
          id: `${ hazard }_stremmingskosten`,
          layer: `ra2ce:${ hazard }_stremmingskosten`,
        }
      ]
      .map(buildWmsLayer)
      .map(layer => {
        const layerInfo = this.layersInfo.find(({ Name }) => Name === layer.layer);

        layer.title = layerInfo.Title;
        
        return layer;
      })
      .forEach(layer => {
        this.$store.commit('mapbox/ADD_WMS_LAYER', layer);
        this.$store.commit('mapbox/UPDATE_LAYER_VISIBILITY', { id: layer.id, map });
      });

      // 4. Start building priorities layer
      this.calculatePrioritiesMap();
    }
  },

  mounted() {
    this.getCapabilities();
  },

  methods: {
    async getCapabilities() {
      this.loading = true;

      const { data } = await axios.get(`${process.env.VUE_APP_WMS_URL}?service=wms&request=GetCapabilities&namespace=ra2ce`);
      const jsonData = parser.parse(data);

      this.layersInfo = jsonData.WMS_Capabilities.Capability.Layer.Layer;
      this.loadingCapabilities = false;
    },

    onVisibilityChange(id) {
      const map = this.$root.map;
      this.$store.commit('mapbox/UPDATE_LAYER_VISIBILITY', { id, map });
    },

    onLegendChange(layer) {
      this.$store.commit('mapbox/SET_LEGEND_LAYER', this.legendLayer === layer ? null : layer);
    },

    updatePriorities(updateData) {
      this.$store.commit('priorities/UPDATE_PRIORITIES', updateData);

      if(this.liveUpdate) {
        this.calculatePrioritiesMapDebounced();
      }
    },

    calculatePrioritiesMap() {
      const map = this.$root.map;
      this.getPrioritiesMessage = 'Calculating the priorities layer';
      this.getPrioritiesError = null;

      const wpsConfig = {
        functionId: 'ra2ce_calc_ratio',
        layer_name: this.selectedHazard,
        json_matrix: { values: this.prioritiesMatrix },
      };

      wps(wpsConfig)
        .then(({ style, layerName }) => {
          this.getPrioritiesMessage = null;

          const prioritiesLayer = buildWmsLayer({
            id: `ra2ce:${ this.selectedHazard }_priority`,
            layer: layerName,
            style
          });
          const layerInfo = this.layersInfo.find(({ Name }) => Name === prioritiesLayer.id);

          prioritiesLayer.title = layerInfo.Title;

          this.$store.commit('mapbox/REMOVE_WMS_LAYER', prioritiesLayer.id);
          this.$store.commit('mapbox/ADD_WMS_LAYER', prioritiesLayer);
        })
        .catch(() => {
          this.getPrioritiesMessage = null;
          this.getPrioritiesError = 'Error Calculating the priorities layer, please retry';
        })
      ;
    },

    calculatePrioritiesMapDebounced: debounce(function() {
      this.calculatePrioritiesMap();
    }, 600),

    restart() {
      this.$store.commit('priorities/RESET_PRIORITIES');
      this.calculatePrioritiesMap();
    }
  },

  created() {
    wps({ functionId: 'ra2ce_provide_hazard_list' })
      .then(list => {
        this.hazardList = list;
      })
      .catch(err => {
        console.error('Error getting list of hazards: ', err);
      })
    ;
  }

};
</script>
