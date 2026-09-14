#!/usr/bin/env node
/**
 * F7·F10 — 키보드가 올라와도 입력 UI 가 가려지거나 찌그러지지 않는다는 것을 **코드에서** 판정한다.
 * (헤드리스 시뮬레이터에는 하드웨어 키보드가 붙어 소프트 키보드를 못 띄운다 — 2026-09-11.)
 *  - 1:1 문의 폼: KeyboardAwareScrollView 안의 폼 + KeyboardStickyView 안의 CTA, 내용란은 고정 minHeight(grow 아님).
 *  - AI 상담: 키보드 높이에 전역 완료 툴바(42) 를 progress 로 더해 컴포저를 올린다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const ROOT = resolve(import.meta.dirname, "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };

const inquiry = read("src/features/settings/views/InquiryScreen.tsx");
if (!/<KeyboardAwareScrollView[\s\S]*bottomOffset=/.test(inquiry)) fail("InquiryScreen: KeyboardAwareScrollView(bottomOffset) 없음");
if (!/<KeyboardStickyView[\s\S]*<V2BottomCTA[\s\S]*<\/KeyboardStickyView>/.test(inquiry)) fail("InquiryScreen: CTA 가 KeyboardStickyView 안에 있지 않음");
if (!/<KeyboardAvoidingView/.test(inquiry) === false) fail("InquiryScreen: KeyboardAvoidingView 가 다시 들어옴(레이아웃 압축 원인)");
const minHeight = /CONTENT_MIN_HEIGHT\s*=\s*(\d+)/.exec(inquiry) ?? /minHeight:\s*(\d{2,3})/.exec(inquiry);
if (!minHeight || Number(minHeight[1]) < 120) fail("InquiryScreen: 내용란 고정 minHeight(>=120) 없음");
if (/\bgrow\b\s*[,}]|flexGrow:\s*1/.test(inquiry.split("KeyboardAwareScrollView")[1] ?? "")) fail("InquiryScreen: 스크롤 뷰 안에서 grow 로 높이를 잼");

const consult = read("src/features/consultation/hooks/useConsultScreen.ts");
const toolbar = /KEYBOARD_TOOLBAR_HEIGHT\s*=\s*(\d+)/.exec(consult);
if (!toolbar || toolbar[1] !== "42") fail("useConsultScreen: 툴바 높이 42 거울 없음");
if (!/keyboardProgress\.value\s*\*\s*accessoryHeight/.test(consult)) fail("useConsultScreen: 툴바 높이를 키보드 진행도에 곱해 더하지 않음");
const lib = read("node_modules/react-native-keyboard-controller/src/components/KeyboardToolbar/constants.ts");
const libHeight = /KEYBOARD_TOOLBAR_HEIGHT\s*=\s*(\d+)/.exec(lib);
if (!libHeight || libHeight[1] !== toolbar[1]) fail(`툴바 높이 거울 불일치: 라이브러리 ${libHeight?.[1]} vs 앱 ${toolbar[1]}`);
console.log(`inquiry: aware-scroll + sticky CTA + minHeight ${minHeight[1]} · consult: toolbar ${toolbar[1]} added by progress`);
console.log("KEYBOARD_LAYOUT_OK");
