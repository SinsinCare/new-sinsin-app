# Gates: Compact restaurant comparison list

Scope: Rework the restaurant result row around place identity, visit information and a contextual nutrition summary, following Mobbin references. Preserve the current map, filters, routes, clinical verdicts and shared dirty checkout. Use the already running Metro 8085 TEST client; restore any temporary QA display settings.

- [ ] L1: Examined Mobbin list references and their adopted hierarchy are documented.
- [ ] L2: The row has a deliberate compact layout with distinguishable identity, rating, location/business metadata and nutrition; unknown data does not imply a verdict or a real venue photo.
- [ ] L3: Native light/dark list, default and enlarged text, row detail entry/back, and list/map transitions are inspected with no clipped critical information; temporary display settings are restored.
- [x] L4: Relevant regression checks and static validation pass.
  CHECK: node -e "const cp=require('node:child_process');cp.execFileSync('node_modules/.bin/jest',['--config','jest.config.ts','--runInBand','tests/restaurantStockPhoto.test.ts','tests/restaurantSafetyBadge.test.ts','tests/restaurantContractDrift.test.ts','tests/remoteImageSource.test.ts','tests/restaurantBusinessStatus.test.ts','tests/restaurantSelectedFirst.test.ts','tests/restaurantSheetTop.test.ts','tests/restaurantSheetDetent.test.ts'],{stdio:'inherit'});cp.execFileSync('node_modules/.bin/tsc',['--noEmit'],{stdio:'inherit'});cp.execFileSync('node_modules/.bin/eslint',['src/features/restaurant','src/shared/images/remoteImageSource.ts'],{stdio:'inherit'});cp.execFileSync('npm',['run','audit:ux-copy'],{stdio:'inherit'});cp.execFileSync('git',['diff','--check'],{stdio:'inherit'});process.stdout.write('RESTAURANT_LIST_CHECKS_OK')"
  EXPECT: RESTAURANT_LIST_CHECKS_OK
  CWD: ../../..
  EVIDENCE: exit=0; shell=/bin/sh; cwd=/Users/seongminhan/workspace/sinsin_dev/sinsin-rn; path=4655babd10c6/24 entries; output=Time:        2.18 s | Ran all test suites matching /tests\/restaurantStockPhoto.test.ts|tests\/restaurantSafetyBadge.test.ts|tests\/restaurantContractDrift.test.ts|tests\/remoteImageSource.test.ts|tests\/restaurantBusinessStatus.test.ts|tes
