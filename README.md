# 招聘会岗位匹配助手

面向求职者的单页静态网站：把招聘会报名导出的单位数据加工成「按专业、学历、地区、期望月薪」排序的匹配结果，附展位号速查与单位详情；支持收藏与清单导出（CSV/文本）、简历匹配（粘贴文字或上传 PDF/Word，均在本机浏览器解析，不上传）。

## 开发与构建

需要 Node 22.12+（22.x 系列）。本机便携版位于 `../node22/node-v22.23.3-win-x64`。

```sh
npm ci
npm run dev      # http://127.0.0.1:5173
npm run build    # 输出到 dist/
```

## 数据管线

- 原始数据：招聘会报名系统导出的 `.xls`（默认读 `C:/Users/EDY/Downloads/招聘会导出 (4).xls`）。
- 重新生成：`python scripts/prepare_fair_data.py [新的xls路径]` → 覆盖 `data/fair.json`。
- 脚本做的事：过滤非「审核通过」记录、合并同名单位、对齐「职位名称 / 职位薪资」、拆分需求专业（学历前缀）、归类地区（临安 / 杭州 / 浙江省内 / 省外）。

## 产业链视图（站内第二个 tab）

「产业链」tab 含三个子视图（手机端优先）：**产业链图谱**（产业→环节结构流图 + 总览 + 单位明细，可一键「在岗位匹配中查看这家」）、**专业适配**（学院→产业链岗位流向桑基图 + 学院机会排行）、**需求总览**（产业链/环节排行 + 环节×能力指向热力矩阵）。

- 数据：`data/chain.json`（含 collegeFlow 学院流向），由 `D:\des\PR\招聘会产业链图谱\build_data.py` 生成（分类规则、学院口径映射都在该脚本，改口径只改一处）；
- 直达链接：站点地址加 `#chain` 直接打开产业链视图；
- 能力热力由在招岗位名称关键词映射（复用 src/fair/matching.ts 的方向词表），非单位填报字段。

## 匹配规则（见页面页脚说明）

v2 权重：专业 42（对口/相近/相关基础分 36/30/24 + 命中条目加成，不限专业 16）+ 期望岗位 15（13 类方向与在招岗位标题比对，简历求职意向可自动识别）+ 技能 15 + 行业 15 + 地区 10 + 薪资 25（按岗位达标覆盖率折算），按已设置维度归一成百分比；地区/行业/规模/标签为硬筛选。

## 检查脚本（dev/，不参与发布）

- `dev/vite.smoke.config.ts` + `dev/smoke.ts`：真实数据跑匹配算法断言。
- `dev/vite.ssr.config.ts` + `dev/ssr-check.tsx`：SSR 渲染主界面，检查关键内容。

```sh
npx vite build --config dev/vite.smoke.config.ts && node dev/smoke-dist/smoke.mjs
npx vite build --config dev/vite.ssr.config.ts && node dev/ssr-dist/ssr-check.mjs
```

## 发布

- Qoder Sites：发布产物为 `dist/`（webDirectory），通过 Qoder Sites 准备与发布。
- Vercel（生产 https://job-fair-match-one.vercel.app）：本地预构建部署
  `vercel pull --yes --environment production && vercel build --prod && vercel deploy --prebuilt --prod`
  （构建前先停掉本地 dev server，避免 npm ci 被 lightningcss 文件占用卡住；`*.vercel.app` 国内需代理访问）。
