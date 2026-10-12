// 渲染烟测：用 SSR 把主界面渲染成 HTML，检查关键内容与运行时错误
import { renderToString } from "react-dom/server";
import App from "../src/App";

const html = renderToString(<App />);

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (!cond) {
    failed += 1;
    console.log(`FAIL  ${name} ${detail}`);
  } else {
    console.log(`ok    ${name} ${detail}`);
  }
}

check("渲染出页面标题", html.includes("岗位匹配助手"));
check("渲染出统计数字", html.includes("237") && html.includes("654"));
check("渲染出第一家公司", html.includes("杭州文津服饰有限公司"));
const boothSamples = [...html.matchAll(/展位[\s\S]{0,30}?19/g)].slice(0, 3).map((m) => m[0].replace(/\n/g, " "));
console.log("展位样例:", JSON.stringify(boothSamples));
check("渲染出展位标记", boothSamples.length > 0);
check("渲染出筛选区", html.includes("我的求职条件"));
check("渲染出收藏入口", html.includes("我的收藏"));
check("渲染出卡片收藏按钮", html.includes("收藏 杭州文津服饰有限公司"));
check("渲染出简历匹配入口", html.includes("粘贴简历匹配"));
check("渲染出期望岗位", html.includes("期望岗位"));
check("渲染出图谱 tab", html.includes("产业链") && html.includes("岗位匹配"));
check("渲染出结果计数", html.includes("家单位"));
check("渲染出专业输入框", html.includes("我的专业"));
check("渲染出 footer 数据说明", html.includes("审核不通过或已取消报名"));
console.log(`html length = ${html.length}`);

if (failed > 0) {
  console.log(`\n${failed} 项失败`);
  process.exit(1);
}
console.log("\n渲染检查通过");
process.exit(0);
