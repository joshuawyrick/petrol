import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  rollupOptions: {
      input: {
        main: 'index.html',
        about: 'about-us/index.html',
        careers: 'careers/index.html',
        contact: 'contact-us/index.html',
        crudeBakersfield: 'crude-oil-transport-bakersfield/index.html',
        crudeCalifornia: 'crude-oil-transportation-california/index.html',
        benefits: 'petrol-transport-inc-benefits/index.html',
        petroleumBakersfield: 'petroleum-transport-bakersfield/index.html',
        safety: 'petroleum-transport-safety-suggestions/index.html',
        privacy: 'privacy-policy/index.html',
        request: 'request-transportation/index.html',
        resources: 'resources/index.html',
        serviceAreas: 'service-areas/index.html',
        thankYou: 'thank-you/index.html',
        kernCounty: 'service-areas/kern-county-crude-oil-transportation/index.html',
        longBeach: 'service-areas/long-beach-crude-oil-transportation/index.html',
        losAngeles: 'service-areas/los-angeles-crude-oil-transportation/index.html',
        santaMaria: 'service-areas/santa-maria-crude-oil-transportation/index.html',
        dispatch: 'resources/24-hour-petroleum-transportation-dispatch/index.html',
        californiaCrude: 'resources/california-crude-oil-transportation/index.html',
        choosingCompany: 'resources/choosing-petroleum-trucking-company/index.html',
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  fs: {
      allow: ['.'],
    },
  },
});
