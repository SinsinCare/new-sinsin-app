# 한국어 UI 문구 전수 교정 (2026-09-03)

사용자 피드백: "한국어 UI 문장들이 외국인이 말하듯 이상하다 — 전수 조사·교정". ko 로케일 7개 파일의 문자열 3,197개를 전부 읽고(리뷰어 5명 분담, 합계 검증), 번역투·한자어 덩어리·형식명사·경어법 혼용·조사 오류를 고쳤다. 규칙: 짧고 다정한 해요체, 사용자가 무엇을 할 수 있는지로 말하기, 의학·법적 문구는 뜻 유지.

교정 127건. 변수·복수형·줄바꿈은 그대로.

| 파일 | 키 | 전 | 후 | 이유 |
|---|---|---|---|---|
| common.json | mobilePolicy.maintenanceBody | 더 안정적으로 이용할 수 있도록 점검하고 있어요. 잠시 후 다시 열어 주세요. | 더 안정적으로 쓸 수 있게 점검하고 있어요. 잠시 후 다시 열어 주세요. | 번역투 |
| common.json | mobilePolicy.recommendedBody | 더 안정적으로 이용할 수 있는 버전이에요. 지금 업데이트할 수 있어요. | 더 안정적으로 쓸 수 있는 버전이에요. 지금 업데이트해 보세요. | 어색 |
| common.json | restaurant.filter.unbackedNotice | 고른 조건 중에는 아직 등록된 식당이 없는 것도 있어요. | 고른 조건 중 일부는 아직 맞는 식당이 없어요. | 형식명사 |
| common.json | restaurant.detail.hoursUnknown | 확인되지 않았어요 | 아직 확인하지 못했어요 | 번역투 |
| common.json | restaurant.detail.nutritionDisclaimer | 일반 레시피로 계산한 추정값이며 이 식당의 실제 조리법을 확인한 값은 아니에요. 주문 전 재료와 양을 식당에 확인하고, 개인 식단 기준은 담당 의료진이나 영양사의 안내를 따라 주세요. | 일반 레시피로 계산한 추정값이라 이 식당의 실제 조리법과는 다를 수 있어요. 주문 전 재료와 양은 식당에 확인하고 개인 식단 기준은 담당 의료진이나 영양사의 안내를 따라 주세요. | 조사 |
| common.json | restaurant.consult.placeholder | AI에게 질문해보세요 | AI에게 물어보세요 | 어색 |
| common.json | restaurant.safety.disclaimer | 이 정보는 공개된 메뉴 정보와 일반적인 영양 특성을 바탕으로 한 추정 분석이에요. 실제 조리 방식과 양에 따라 차이가 있을 수 있고, 의료진·영양사 상담을 대신하지 않아요. | 공개된 메뉴 정보와 일반적인 영양 특성으로 추정한 값이에요. 실제 조리 방식과 양에 따라 다를 수 있고 의료진·영양사 상담을 대신하지 않아요. | 번역투 |
| common.json | restaurant.safety.menuNotice | 매장 운영상황에 따라 정보가 달라질 수 있습니다. | 매장 사정에 따라 정보가 달라질 수 있어요. | 경어법 |
| common.json | restaurant.safety.mealBasis | 한 끼 기준은 하루 목표량을 세 끼로 나눈 몫이에요. | 한 끼 기준은 하루 목표량을 세 끼로 나눈 양이에요. | 어색 |
| common.json | restaurant.map.searchPlaceholder | 식당을 검색해보세요 | 식당을 검색해 보세요 | 오타 |
| common.json | restaurant.error.appBugBody | 인터넷 문제는 아니에요. 저희가 잘못된 요청을 보냈어요. 다시 시도해 보시고, 계속되면 알려주세요. | 인터넷 문제는 아니에요. 저희가 잘못된 요청을 보냈어요. 다시 시도해 보시고 계속되면 알려 주세요. | 조사 |
| common.json | restaurant.error.malformedBody | 인터넷 문제는 아니에요. 앱과 서버가 주고받는 형식이 어긋났어요. 다시 시도해 보시고, 계속되면 알려주세요. | 인터넷 문제는 아니에요. 앱과 서버가 주고받는 형식이 어긋났어요. 다시 시도해 보시고 계속되면 알려 주세요. | 조사 |
| common.json | restaurant.aiSearch.noFilters | 말씀하신 내용에서 옮길 수 있는 조건을 찾지 못했어요. | 말씀하신 내용에서 적용할 조건을 찾지 못했어요. | 어색 |
| common.json | restaurant.review.ratingCount | {{count}}개 평점 | 평점 {{count}}개 | 어색 |
| common.json | restaurant.review.reportReasonSubtitle | 타당한 근거 없는 신고 내용은 반영되지 않을 수 있습니다. | 근거가 없는 신고는 반영되지 않을 수 있어요. | 경어법 |
| common.json | restaurant.review.reportReasons.ORDER_IRRELEVANT | 주문과 관련없는 내용 | 주문과 관련 없는 내용 | 오타 |
| common.json | restaurant.review.form.keywordHint | 여러 개 선택 가능합니다 | 여러 개 고를 수 있어요 | 경어법 |
| common.json | restaurant.review.form.contentHint | 장소와 무관한 내용은 유의해 주세요 | 식당과 관계없는 내용은 적지 말아 주세요 | 어색 |
| common.json | restaurant.review.form.guidelineBody | 장소와 무관한 내용, 광고, 개인정보가 담긴 후기는 안내 없이 지워질 수 있어요.⏎욕설·비방·명예훼손성 표현은 누군가에게 상처가 됩니다.⏎메뉴와 방문 경험을 사실대로 적어 주시면 다른 분들에게 큰 도움이 돼요. | 식당과 관계없는 내용, 광고, 개인정보가 담긴 후기는 안내 없이 지워질 수 있어요.⏎욕설·비방·명예훼손성 표현은 누군가에게 상처가 돼요.⏎메뉴와 방문 경험을 사실대로 적어 주시면 다른 분들에게 큰 도움이 돼요. | 경어법 |
| common.json | restaurant.reviewer.reviewsUnavailableBody | 이 사람이 쓴 후기 목록은 아직 제공되지 않아요. 식당 상세의 후기 탭에서 볼 수 있어요. | 이 사람이 쓴 후기는 아직 모아 보여드리지 못해요. 식당 상세의 후기 탭에서 볼 수 있어요. | 번역투 |
| common.json | restaurant.mediaPicker.recent | 최근항목 | 최근 항목 | 오타 |
| common.json | stats.glucose.worstCell | {{cell}} 이(가) 목표를 가장 자주 벗어났어요 · {{count}}회 | {{cell}}에 목표를 가장 자주 벗어났어요 · {{count}}회 | 조사 |
| common.json | stats.nutrientGraph.generalBody | 프로필을 불러오기 전 사용하는 일반 참고값이에요. | 프로필을 불러오기 전에 쓰는 일반 참고값이에요. | 어색 |
| common.json | home.sheet.water.overLimitGuidance | 기준을 넘었어요. 추가 수분은 의료진 안내를 확인해 주세요. | 기준을 넘었어요. 더 마셔도 되는지는 의료진에게 확인해 주세요. | 한자어 |
| common.json | home.sheet.weight.noComparisonInfo | 전날과 비교하려면 가능하면 같은 시간과 비슷한 조건에서 기록해 주세요. | 전날과 비교하려면 되도록 같은 시간, 비슷한 조건에서 기록해 주세요. | 어색 |
| common.json | mealReport.energyReferencePercent | 체중 기반 참고값의 {{percent}}% | 체중으로 계산한 참고값의 {{percent}}% | 한자어 |
| common.json | mealReport.relevantNutrients | 이 음식에서 문제되는 영양소 | 이 음식에서 주의할 영양소 | 어색 |
| common.json | mealReport.nutritionNotice | 실제 영양소 함량은 조리법과 양념에 따라 달라질 수 있어요. 하루 기준은 등록한 콩팥 상태를 반영했으며, 치료는 의료진 안내를 따라 주세요. | 실제 영양소 함량은 조리법과 양념에 따라 달라질 수 있어요. 하루 기준은 등록한 콩팥 상태로 계산했어요. 치료는 의료진 안내를 따라 주세요. | 번역투 |
| common.json | foodResult.instagramErrorBody | 인스타그램이 설치되어 있는지 확인한 뒤 다시 해 주세요. | 인스타그램이 설치돼 있는지 확인한 뒤 다시 시도해 주세요. | 어색 |
| common.json | foodResult.kakaoErrorBody | 카카오톡이 설치되어 있는지 확인한 뒤 다시 해 주세요. | 카카오톡이 설치돼 있는지 확인한 뒤 다시 시도해 주세요. | 어색 |
| common.json | foodResult.chartExplanation | 원 그래프는 내 프로필에 설정된 하루 기준 중 이 음식이 차지하는 비율이에요. | 원 그래프는 내 프로필의 하루 기준 중 이 음식이 차지하는 비율이에요. | 번역투 |
| common.json | foodResult.referencesNote | 앱의 영양소 참고 기준을 정할 때 KDIGO 2024, 대한신장학회 CKD 영양 권고안, 한국영양학회 식품성분DB를 참고했어요. 사진에서 추정한 값은 진료를 대신하지 않으며, 개인 기준은 담당 의료진의 안내를 먼저 따라 주세요. | 앱의 영양소 참고 기준을 정할 때 KDIGO 2024, 대한신장학회 CKD 영양 권고안, 한국영양학회 식품성분DB를 참고했어요. 사진에서 추정한 값은 진료를 대신하지 않아요. 개인 기준은 담당 의료진의 안내를 먼저 따라 주세요. | 번역투 |
| common.json | foodConfirmation.body | 맞는 내용을 골라 주면 영양소를 더 정확히 계산할 수 있어요. | 맞는 내용을 골라 주시면 영양소를 더 정확히 계산할 수 있어요. | 경어법 |
| common.json | foodLoading.tips.t01 | 투석 전 CKD 3–5기는 단백질을 줄이는 게 권장돼요.⏎목표량은 프로필 기준으로 계산돼요. | 투석 전 CKD 3–5기는 단백질을 줄이는 게 좋아요.⏎목표량은 프로필 기준으로 계산해요. | 번역투 |
| common.json | foodLoading.tips.t04 | 가공식품의 인은 흡수율이 높아 더 주의가 필요해요. | 가공식품의 인은 흡수율이 높아 더 조심해야 해요. | 번역투 |
| common.json | foodLoading.tips.t05 | 단백질을 “완전히” 피하면 영양부족이 올 수 있어요.⏎적정량이 중요해요. | 단백질을 “완전히” 피하면 영양부족이 올 수 있어요.⏎알맞은 양이 중요해요. | 한자어 |
| common.json | foodLoading.tips.t07 | 최근 1개월 식단 패턴이 GFR 변화와 연결될 수 있어요. | 최근 1개월 식단 패턴이 GFR 변화에 영향을 줄 수 있어요. | 번역투 |
| common.json | foodLoading.tips.t11 | 인 수치가 높으면 가려움과 연관될 수 있어요. | 인 수치가 높으면 몸이 가려울 수 있어요. | 번역투 |
| common.json | foodLoading.tips.t12 | 나트륨 과다 섭취는 혈압과 GFR 감소에 영향을 줘요. | 나트륨을 많이 먹으면 혈압이 오르고 GFR이 떨어질 수 있어요. | 한자어 |
| common.json | foodLoading.tips.t13 | 체중 급증은 수분 저류의 신호일 수 있어요. | 체중이 갑자기 늘면 몸에 물이 차고 있다는 신호일 수 있어요. | 한자어 |
| common.json | consult.placeholder | 궁금한 내용을 적어보세요 | 궁금한 내용을 적어 보세요 | 오타 |
| common.json | consult.mealPrompt | 이 식사의 영양 수치를 개인 기준과 비교하고, 다음 식사에서 확인할 항목을 알려 주세요. | 이 식사의 영양 수치를 내 기준과 비교하고 다음 식사에서 확인할 점을 알려 주세요. | 조사 |
| common.json | consult.examPrompt | 제 건강검진 결과를 함께 봐주세요. 아래 수치가 어떤 의미인지 설명해 주세요. | 제 건강검진 결과를 함께 봐 주세요. 아래 수치가 어떤 의미인지 설명해 주세요. | 오타 |
| recipe.json | list.suggestKeyword | '{{text}}' 로 검색 | '{{text}}'로 검색 | 조사 |
| recipe.json | curated.estimateBody | 표시된 값은 일반 식품 자료로 계산한 추정값이에요. 실제 재료와 양에 따라 달라질 수 있고, 이 레시피가 개인에게 맞는지를 판단한 결과는 아니에요. | 여기 보이는 값은 일반 식품 자료로 계산한 추정값이에요. 실제 재료와 양에 따라 달라질 수 있어요. 이 레시피가 나에게 맞는지 판단한 결과는 아니에요. | 어색 |
| recipe.json | detail.error.notFoundBody | 지워졌거나 주소가 잘못됐어요. 인터넷 문제는 아니고, 다시 눌러도 같아요. | 지워졌거나 주소가 잘못됐어요. 인터넷 문제는 아니라서 다시 눌러도 같아요. | 조사 |
| recipe.json | detail.error.appBugBody | 인터넷 문제는 아니에요. 저희가 잘못된 요청을 보냈어요. 다시 시도해 보시고, 계속되면 알려주세요. | 인터넷 문제는 아니에요. 저희가 잘못된 요청을 보냈어요. 다시 시도해 보시고 계속되면 알려 주세요. | 조사 |
| recipe.json | detail.localeGapBody | 번역이 준비되면 자동으로 바뀝니다. 그때까지 원문을 그대로 보여드려요. | 번역이 준비되면 자동으로 바뀌어요. 그때까지 원문을 그대로 보여드려요. | 경어법 |
| recipe.json | detail.nutrition.explainScope | 여기 있는 숫자는 내 기록에서 뺀 남은 참고량과 이 레시피의 수치를 나눈 결과예요. 이 레시피가 나에게 맞는지를 판단한 결과는 아니에요. | 여기 있는 숫자는 오늘 남은 양에서 이 레시피가 차지하는 비율이에요. 이 레시피가 나에게 맞는지 판단한 결과는 아니에요. | 한자어 |
| recipe.json | detail.nutrition.unavailableBody | 수치의 출처를 확인할 수 없어서 그리지 않았어요. | 출처를 확인할 수 없는 수치라서 보여드리지 않아요. | 어색 |
| recipe.json | detail.reviews.blockBody | {{name}} 님이 쓴 리뷰가 앱 전체에서 보이지 않아요. 차단은 내 정보 → 차단 목록에서 해제할 수 있어요. | {{name}}님이 쓴 리뷰가 앱 전체에서 보이지 않아요. 차단은 내 정보 → 차단 목록에서 해제할 수 있어요. | 조사 |
| recipe.json | recipeWrite.editUnavailableBody | 지금은 새 레시피를 올리는 것만 할 수 있어요. 고칠 내용이 있으면 새로 올려 주세요. | 지금은 새 레시피만 올릴 수 있어요. 고칠 내용이 있으면 새로 올려 주세요. | 형식명사 |
| recipe.json | recipeWrite.field.summary | 한줄 소개 | 한 줄 소개 | 오타 |
| recipe.json | recipeWrite.field.servingsNote | 적어 준 재료 전체가 몇 명이 먹을 양인지 알려 주세요. 영양은 한 명 기준으로 계산해요. | 적은 재료 전체가 몇 명이 먹을 양인지 알려 주세요. 영양은 한 명 기준으로 계산해요. | 어색 |
| recipe.json | recipeWrite.field.descriptionPlaceholder | 신장 건강을 고려한 저염·균형 식단 레시피를 나누는 공간입니다.⏎⏎재료 양, 조리 방법, 간을 줄인 팁 등을 함께 적어 주시면 다른 분들께 큰 도움이 됩니다. | 신장 건강을 생각한 저염·균형 식단 레시피를 나누는 공간이에요.⏎⏎재료 양, 조리 방법, 간을 줄인 팁을 함께 적어 주시면 다른 분들께 큰 도움이 돼요. | 경어법 |
| recipe.json | recipeWrite.classify.searchOnlyNotice | 검색에만 쓰이고 레시피 카드에는 표시되지 않아요 | 검색에만 쓰고 레시피 카드에는 보이지 않아요 | 어색 |
| recipe.json | recipeWrite.ingredient.hintUnmeasurable | 무게를 알 수 없는 표기예요. “150g” 처럼 적어 주세요 | 무게를 알 수 없는 표기예요. “150g”처럼 적어 주세요 | 조사 |
| recipe.json | recipeWrite.step.sheetTitle | 조리순서 | 조리 순서 | 오타 |
| recipe.json | recipeWrite.nutrition.provenanceNote | 적어 준 재료와 분량을 식품 성분표로 계산한 값이에요. 영양사가 검수한 값은 아니에요. | 적은 재료와 분량을 식품 성분표로 계산한 값이에요. 영양사가 검수한 값은 아니에요. | 어색 |
| recipe.json | recipeWrite.nutrition.unmatchedItem | “{{name}}” 은 무게를 몰라 계산에서 빠졌어요 | “{{name}}”은 무게를 몰라 계산에서 빠졌어요 | 조사 |
| recipe.json | recipeWrite.nutrition.unmatchedHelp | “150g” 처럼 무게로 적으면 계산에 들어가요. | “150g”처럼 무게로 적으면 계산에 들어가요. | 조사 |
| recipe.json | recipeWrite.nutrition.unmatchedNotFound | “{{name}}” 은 식품 성분표에서 찾지 못했어요 | “{{name}}”은 식품 성분표에서 찾지 못했어요 | 조사 |
| recipe.json | recipeWrite.missing.summary | 한줄 소개를 적어 주세요 | 한 줄 소개를 적어 주세요 | 오타 |
| recipe.json | recipeWrite.result.successUnmatched | 재료 {{n}}개는 무게를 몰라 영양 계산에서 빠졌어요. 올린 레시피는 아직 고칠 수 없어서, 다음에는 “150g” 처럼 무게로 적어 주세요. | 재료 {{n}}개는 무게를 몰라 영양 계산에서 빠졌어요. 올린 레시피는 아직 고칠 수 없어서 다음에는 “150g”처럼 무게로 적어 주세요. | 조사 |
| settings.json | phone.subtitle | 전화번호는 입력하지 않아도 돼요. 연락이 필요한 경우에 사용하고, 마케팅 안내는 동의했을 때만 보내요. | 전화번호는 입력하지 않아도 돼요. 연락이 필요할 때만 쓰고 마케팅 안내는 동의했을 때만 보내요. | 어색 |
| settings.json | phone.usageNote | 로그인·계정 연결·SMS 본인 인증에는 사용하지 않아요. | 로그인·계정 연결·SMS 본인 인증에는 쓰지 않아요. | 어색 |
| settings.json | phone.deleteBody | 삭제하면 연락이나 동의한 마케팅 안내에 이 번호를 사용하지 않아요. | 삭제하면 연락이나 동의한 마케팅 안내에 이 번호를 쓰지 않아요. | 어색 |
| settings.json | notifications.morning.body | 첫 소변 뒤, 물을 마시기 전 혈압과 체중 기록을 알려드려요 | 첫 소변을 본 뒤 물을 마시기 전에 혈압과 체중을 기록하도록 알려드려요 | 어색 |
| settings.json | notifications.water.body | 설정한 간격마다 수분 섭취를 확인할 시간을 알려드려요 | 정한 주기마다 물을 얼마나 마셨는지 확인하도록 알려드려요 | 한자어 |
| settings.json | notifications.meal.body | 식사 시간에 맞춰 기록할 시간을 알려드려요 | 식사 시간에 맞춰 기록하도록 알려드려요 | 어색 |
| settings.json | notifications.scheduled.waterTitle | 수분 섭취를 확인할 시간이에요 | 물 마신 양을 확인할 시간이에요 | 한자어 |
| settings.json | notifications.scheduled.waterBody | 오늘 남은 수분량을 확인해 보세요. | 오늘 더 마실 수 있는 물의 양을 확인해 보세요. | 한자어 |
| settings.json | medical.lead | 여기 모은 자료는 신신당부의 영양·의료 안내를 검토할 때 참고한 것 중 일부예요. 자료마다 적용 범위가 달라요. | 신신당부의 영양·의료 안내를 검토할 때 참고한 자료 중 일부예요. 자료마다 다루는 범위가 달라요. | 형식명사 |
| settings.json | medical.empty | 검색어와 맞는 자료가 없어요 | 검색어에 맞는 자료가 없어요 | 조사 |
| settings.json | kidney.validation.dateFuture | 이번 달 또는 이전 시기를 선택해 주세요. | 이번 달이나 그 전으로 선택해 주세요. | 어색 |
| settings.json | doctor.status.empty | 아직 연결된 의사가 없어요. 새 연결이 생겼는지 다시 확인할 수 있어요. | 아직 연결된 의사가 없어요. 새로 연결됐는지 다시 확인해 보세요. | 어색 |
| settings.json | doctor.terms.withdrawalBody | 언제든 건강 기록 공유를 중단하거나 삭제를 요청할 수 있어요. 회원 탈퇴 시 공유된 기록도 보관·삭제 정책에 따라 삭제돼요. | 언제든 건강 기록 공유를 중단하거나 삭제를 요청할 수 있어요. 회원을 탈퇴하면 공유한 기록도 보관·삭제 정책에 따라 삭제돼요. | 한자어 |
| settings.json | doctor.terms.supportBody | 기록 공유·삭제 문의는 앱의 1:1 문의나 고객센터에서 접수할 수 있어요. | 기록 공유·삭제가 궁금하면 앱의 1:1 문의나 고객센터로 알려 주세요. | 한자어 |
| settings.json | doctorLink.intro.headlineLead | 담당 의사 선생님과 연결하여 | 담당 의사 선생님과 연결하고 | 번역투 |
| settings.json | doctorLink.preview.noticePurpose | 공유된 데이터는 진료 목적으로만 사용되며 개인정보 보호법에 따라 안전하게 보호돼요. | 공유한 데이터는 진료 목적으로만 쓰고 개인정보 보호법에 따라 안전하게 보호해요. | 번역투 |
| settings.json | doctorLink.preview.noticeRevoke | 사용자는 정보를 언제든지 공유를 중단할 수 있어요. | 정보 공유는 언제든지 중단할 수 있어요. | 조사 |
| settings.json | doctorLink.sharing.vitalsBody | 일일 수치 및 변화 추이 | 매일 잰 수치와 변화 흐름 | 한자어 |
| settings.json | doctorLink.sharing.realtimeTitle | 실시간 데이터 전송 활성화 | 실시간으로 데이터 보내기 | 한자어 |
| settings.json | doctorLink.sharing.realtimeBody | 기록 시 즉시 병원으로 전송해요 | 기록하면 바로 병원으로 보내요 | 한자어 |
| auth.json | password.createSubtitle | 다음 로그인부터 이 비밀번호를 사용해요. | 다음부터 이 비밀번호로 로그인해요. | 어색 |
| auth.json | forgotPassword.newSubtitle | 다음 로그인부터 새 비밀번호를 사용해요. | 다음부터 새 비밀번호로 로그인해요. | 어색 |
| auth.json | linkPassword.title | 이메일 로그인에 사용할⏎비밀번호를 만들어 주세요 | 이메일 로그인에 쓸⏎비밀번호를 만들어 주세요 | 어색 |
| auth.json | socialLink.title | {{provider}} 로그인에 사용할⏎이메일을 알려 주세요 | {{provider}} 로그인에 쓸⏎이메일을 알려 주세요 | 어색 |
| auth.json | profile.nickname.taken | 이미 사용 중인 닉네임이에요. | 이미 쓰고 있는 닉네임이에요. | 어색 |
| auth.json | profile.birth.subtitle | 연령에 맞는 영양 기준을 안내할게요. | 나이에 맞는 영양 기준을 안내할게요. | 한자어 |
| auth.json | profile.gender.subtitle | 영양 기준을 계산할 때 사용해요. | 영양 기준을 계산할 때 써요. | 어색 |
| auth.json | profile.phone.subtitle | 개인 연락이 필요할 때만 사용해요. | 개인 연락이 필요할 때만 써요. | 어색 |
| auth.json | onboarding.ckd.4.subtitle | 체중은 신장 단계·투석 여부와 함께 하루 참고 기준을 계산하는 데 사용해요.⏎키는 선택 사항이에요. | 체중은 신장 단계·투석 여부와 함께 하루 참고 기준을 계산할 때 써요.⏎키는 선택 사항이에요. | 어색 |
| auth.json | onboarding.ckd.5.title | 신장 식이에 대해⏎얼마나 알고 있나요? | 신장 식이를⏎얼마나 알고 있나요? | 번역투 |
| auth.json | onboarding.ckd.6.options.PORTION_SIZE | 적절한 1회 섭취량을 모르겠어요 | 한 번에 얼마나 먹어야 할지 모르겠어요 | 한자어 |
| auth.json | onboarding.ckd.9.title | 진단받은 연도와 달을 알려주세요 | 진단받은 연도와 달을 알려 주세요 | 조사 |
| auth.json | onboarding.ckd.10.subtitle | 해당되는 것을 모두 선택해 주세요. | 해당하는 항목을 모두 골라 주세요. | 형식명사 |
| auth.json | onboarding.nonCkd.1.title | 신장 건강과 관련해 해당되는 것이 있나요? | 신장 건강과 관련해 해당하는 항목이 있나요? | 형식명사 |
| auth.json | onboarding.nonCkd.1.subtitle | 해당되는 것만 골라 주세요. | 해당하는 항목만 골라 주세요. | 형식명사 |
| auth.json | onboarding.nonCkd.2.subtitle | 이 앱을 사용하게 된 이유를 알려 주세요. | 이 앱을 쓰게 된 이유를 알려 주세요. | 어색 |
| auth.json | onboarding.nonCkd.4.subtitle | 체중은 신장 상태와 함께 하루 참고 기준을 계산하는 데 사용해요.⏎키는 선택 사항이에요. | 체중은 신장 상태와 함께 하루 참고 기준을 계산할 때 써요.⏎키는 선택 사항이에요. | 어색 |
| errors.json | code.FOOD_CAMERA_001.body | 다른 형식이라면 갤러리에서 편집 후 저장하면 JPG로 바뀌어요. | 다른 형식이라면 갤러리에서 편집한 뒤 저장하면 JPG로 바뀌어요. | 한자어 |
| errors.json | code.FOOD_CAMERA_009.body | '현미밥 한 공기, 된장국' 처럼 음식 이름과 양을 적으면 분석할 수 있어요. | '현미밥 한 공기, 된장국'처럼 음식 이름과 양을 적으면 분석할 수 있어요. | 조사 |
| errors.json | code.SOCIAL_CONFIG_ERROR.body | 앱 설정 문제라 인터넷과는 무관해요. 이메일 로그인을 이용해 주시고, 문의를 보내 주시면 확인해 드릴게요. | 인터넷 문제가 아니라 앱 설정 문제예요. 이메일로 로그인해 주시고, 문의를 보내 주시면 확인해 드릴게요. | 한자어 |
| health.json | entry.usageNote | 가져온 결과는 검사 수치와 변화를 보여 주는 데 사용해요. | 가져온 결과는 검사 수치와 변화를 보여 주는 데 써요. | 어색 |
| health.json | result.judgements.NORMAL_A.description | 현재 검진 결과에서 특별한 이상이 확인되지 않았어요. 정기 검진을 이어가세요. | 이번 검진에서는 특별한 이상이 확인되지 않았어요. 정기 검진을 이어가 주세요. | 번역투 |
| health.json | result.judgements.NORMAL_B.description | 생활습관 관리가 필요한 항목이 있을 수 있어요. 세부 검사 결과를 함께 확인하세요. | 생활습관 관리가 필요한 항목이 있을 수 있어요. 세부 검사 결과를 함께 확인해 주세요. | 경어법 |
| health.json | result.judgements.NORMAL.description | 현재 검진 결과에서 특별한 이상이 확인되지 않았어요. 정기 검진을 이어가세요. | 이번 검진에서는 특별한 이상이 확인되지 않았어요. 정기 검진을 이어가 주세요. | 번역투 |
| health.json | result.judgements.GENERAL_DISEASE_SUSPECTED.description | 추가 확인이 필요한 항목이 있어요. 세부 결과와 검진기관 안내를 확인하세요. | 더 확인해야 할 항목이 있어요. 세부 결과와 검진기관 안내를 확인해 주세요. | 한자어 |
| health.json | result.judgements.CARDIOMETABOLIC_DISEASE_SUSPECTED.description | 혈압이나 혈당과 관련해 추가 확인이 필요한 항목이 있어요. 의료기관과 상의해 주세요. | 혈압이나 혈당에서 더 확인해야 할 항목이 있어요. 의료기관과 상의해 주세요. | 한자어 |
| health.json | result.judgements.DISEASE_SUSPECTED.description | 추가 확인이 필요한 항목이 있어요. 세부 결과와 검진기관 안내를 확인하세요. | 더 확인해야 할 항목이 있어요. 세부 결과와 검진기관 안내를 확인해 주세요. | 한자어 |
| health.json | result.judgements.KNOWN_CONDITION.description | 현재 관리 중인 질환을 고려해 검진 결과를 의료진과 함께 확인하세요. | 지금 관리 중인 질환이 있으니 검진 결과를 의료진과 함께 확인해 주세요. | 경어법 |
| health.json | result.judgements.REVIEW_NEEDED.description | 확인이 필요한 항목이 있어요. 특정 질환을 뜻하는 것은 아니므로 세부 결과를 확인하세요. | 확인이 필요한 항목이 있어요. 특정 질환을 뜻하지는 않으니 세부 결과를 확인해 주세요. | 형식명사 |
| health.json | result.judgements.UNKNOWN.description | 판정 문구를 자동으로 해석하기 어려워요. 세부 결과와 검진기관 안내를 확인하세요. | 판정 문구를 자동으로 읽지 못했어요. 세부 결과와 검진기관 안내를 확인해 주세요. | 경어법 |
| health.json | dashboard.recordCount | 총 {{count}}건의 검진 기록 | 검진 기록 총 {{count}}건 | 번역투 |
| health.json | dashboard.recordCount_one | 총 {{count}}건의 검진 기록 | 검진 기록 총 {{count}}건 | 번역투 |
| health.json | dashboard.recordCount_other | 총 {{count}}건의 검진 기록 | 검진 기록 총 {{count}}건 | 번역투 |
| health.json | dashboard.noTrend | 아직 변화 추이를 볼 수 있는 검사 항목이 없어요. | 아직 변화를 볼 수 있는 검사 항목이 없어요. | 한자어 |
| health.json | nhis.confirmFailed | 인증 앱에서 완료되지 않았거나 입력 정보가 다를 수 있어요. 이전 화면에서 확인해 주세요. | 인증 앱에서 인증을 마치지 않았거나 입력한 정보가 다를 수 있어요. 이전 화면에서 확인해 주세요. | 번역투 |
| health.json | nhis.noResultsDescription | 본인인증은 정상적으로 끝났어요. 보험공단에 등록된 검진 기록이 아직 없습니다. 검진을 받으신 뒤 다시 불러와 주세요. | 본인인증은 잘 끝났어요. 보험공단에 등록된 검진 기록이 아직 없어요. 검진을 받으신 뒤 다시 불러와 주세요. | 경어법 |
| health.json | checkup.auth.pendingTitle | 인증 앱에서 인증을 완료해 주세요 | 인증 앱에서 인증을 마쳐 주세요 | 한자어 |
| health.json | checkup.auth.pendingConfirm | 인증 완료했어요 | 인증했어요 | 어색 |
| health.json | checkup.list.visitCount_one | {{count}}번의 방문 | {{count}}번 방문 | 번역투 |
| health.json | checkup.list.visitCount_other | {{count}}번의 방문 | {{count}}번 방문 | 번역투 |
| health.json | checkup.records.monthlyView | 월별보기 | 월별 보기 | 조사 |
| health.json | checkup.records.weeklyView | 주별보기 | 주별 보기 | 조사 |
| health.json | checkup.records.deltaLabel | 지난 진단 대비 | 지난 검진 대비 | 어색 |
