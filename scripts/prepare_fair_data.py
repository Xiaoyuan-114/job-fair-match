# -*- coding: utf-8 -*-
"""把招聘会导出 xls 规范化为站点数据 src/data/fair.json

用法: python scripts/prepare_fair_data.py [xls路径]
默认读取 C:/Users/EDY/Downloads/招聘会导出 (4).xls
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import xlrd

DEFAULT_XLS = Path(r"C:/Users/EDY/Downloads/招聘会导出 (4).xls")
OUT = Path(__file__).resolve().parent.parent / "data" / "fair.json"

REGION_LABELS = {
    "linan": "临安",
    "hangzhou": "杭州（除临安）",
    "zhejiang": "浙江省内其他",
    "outside": "浙江省外",
    "unknown": "地区未填",
}


def ssplit(value):
    """按 、，,；;. 拆分，但括号内的分隔符不拆。"""
    s = str(value)
    out, cur, depth = [], "", 0
    for ch in s:
        if ch in "（(":
            depth += 1
        elif ch in "）)":
            depth = max(0, depth - 1)
        if ch in "、，,；;." and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return [x.strip() for x in out if x.strip()]


def clean_text(value):
    s = str(value or "").replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", s).strip()


def parse_salary(text):
    m = re.match(r"^(\d+)\s*[-~—]\s*(\d+)$", text.strip())
    if not m:
        return None, None
    return int(m.group(1)), int(m.group(2))


def parse_positions(raw_pos, raw_sal):
    titles = ssplit(raw_pos)
    salaries = ssplit(raw_sal)
    # 去掉不属于岗位的备注（如 “2028届都可”），直到数量对齐
    if len(titles) > len(salaries):
        notes = [t for t in titles if len(t) <= 14 and re.search(r"(\d{4}届|应往届|届都|均可|优先)", t)]
        for n in notes:
            if len(titles) > len(salaries) and n in titles:
                titles.remove(n)
    out = []
    for i, t in enumerate(titles):
        title = clean_text(t)
        smin = smax = None
        if i < len(salaries):
            smin, smax = parse_salary(salaries[i])
        out.append({"title": title, "salaryMin": smin, "salaryMax": smax})
    return out


def parse_majors(raw):
    majors, no_limit = [], False
    seen = set()
    for item in ssplit(raw):
        if item in ("不限专业", "不限", "专业不限"):
            no_limit = True
            continue
        m = re.match(r"^【([^】]+)】(.*)$", item)
        if m:
            degree, name = m.group(1).strip(), m.group(2).strip()
        else:
            degree, name = "", item.strip()
        if not name:
            continue
        key = (degree, name)
        if key in seen:
            continue
        seen.add(key)
        majors.append({"degree": degree, "name": name})
    return majors, no_limit


def region_of(*texts):
    joined = "".join(texts)
    if "临安" in joined:
        return "linan"
    if "杭州" in joined:
        return "hangzhou"
    if "浙江" in joined:
        return "zhejiang"
    if re.search(r"(省|市|区|县)", joined):
        return "outside"
    return "unknown"


def city_of(location):
    m = re.search(r"省([^省市]+市)", location)
    if m:
        return m.group(1)
    m = re.search(r"^(北京市|上海市|天津市|重庆市)", location)
    if m:
        return m.group(1)
    m = re.search(r"([^省市]{2,6}市)", location)
    if m:
        return m.group(1)
    return location[:12] if location else ""


def int_or_none(value):
    s = str(value).strip()
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def capital_of(value):
    try:
        v = float(str(value).strip() or 0)
    except ValueError:
        return None
    return v if v > 0 else None


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLS
    wb = xlrd.open_workbook(str(src), ignore_workbook_corruption=True)
    sh = wb.sheet_by_index(0)
    raw_rows = [[sh.cell_value(r, c) for c in range(sh.ncols)] for r in range(1, sh.nrows)]

    approved, skipped = [], 0
    for r in raw_rows:
        if clean_text(r[23]) != "审核通过":
            skipped += 1
            continue
        approved.append(r)

    # 同名单位合并（通常是同一家单位先后报名两次）
    groups = {}
    for r in approved:
        name = clean_text(r[3])
        groups.setdefault(name, []).append(r)

    companies = []
    for name, recs in groups.items():
        recs.sort(key=lambda r: len(ssplit(r[20])), reverse=True)
        primary = recs[0]
        booths = []
        for r in recs:
            b = clean_text(r[1])
            if b and b not in booths:
                booths.append(b)
        try:
            booths.sort(key=int)
        except ValueError:
            booths.sort()

        positions = []
        seen_titles = set()
        headcount = None
        majors, seen_majors, no_limit = [], set(), False
        for r in recs:
            for p in parse_positions(r[20], r[22]):
                if p["title"] in seen_titles:
                    continue
                seen_titles.add(p["title"])
                positions.append(p)
            for mj in parse_majors(r[21])[0]:
                key = (mj["degree"], mj["name"])
                if key not in seen_majors:
                    seen_majors.add(key)
                    majors.append(mj)
            no_limit = no_limit or parse_majors(r[21])[1]
            hc = int_or_none(r[19])
            if hc is not None:
                headcount = hc if headcount is None else max(headcount, hc)

        tags = []
        for r in recs:
            for t in ssplit(r[31]):
                if t and t != "其他" and t not in tags:
                    tags.append(t)

        location = clean_text(primary[17])
        address = clean_text(primary[5])
        companies.append({
            "id": 0,
            "name": name,
            "booths": booths,
            "creditCode": clean_text(primary[4]),
            "address": address,
            "contact": clean_text(primary[6]),
            "phone": clean_text(primary[9]) or clean_text(primary[7]),
            "email": clean_text(primary[10]),
            "category": clean_text(primary[12]),
            "nature": clean_text(primary[13]),
            "industry": clean_text(primary[14]),
            "size": "" if clean_text(primary[16]) in ("--请选择--", "其他") else clean_text(primary[16]),
            "capital": capital_of(primary[15]),
            "location": location,
            "city": city_of(location),
            "region": region_of(location, address),
            "headcount": headcount,
            "positions": positions,
            "majors": majors,
            "noLimit": no_limit,
            "tags": tags,
            "intro": clean_text(primary[27]),
        })

    companies.sort(key=lambda c: (int(c["booths"][0]) if c["booths"] and c["booths"][0].isdigit() else 9999))
    for i, c in enumerate(companies, 1):
        c["id"] = i

    # 专业选项：按基础名（去括号后缀）聚合
    # ★ 少数单位把岗位要求文本误填进「需求专业」栏，其条目会污染专业选项表，
    #   这里做形态过滤：需含中文、2-12 字，且不含 JD 类词
    junk_re = re.compile(r"(负责|熟练|优先|经验|能力|工具|软件|项目|熟悉|掌握|良好|以上|工作|编程|开发|设计经验)")
    junk_exact = {"微信", "小程序", "抖音", "公众号", "分析", "数据", "运营", "客服", "美工", "剪辑"}
    def is_clean_major(name):
        if name in junk_exact:
            return False
        if not re.search(r"[\u4e00-\u9fff]", name):
            return False
        if not (2 <= len(name) <= 12):
            return False
        return not junk_re.search(name)

    major_counts = {}
    for c in companies:
        for mj in c["majors"]:
            base = re.sub(r"[（(].*?[）)]", "", mj["name"]).strip()
            if not base or not is_clean_major(base):
                continue
            e = major_counts.setdefault(base, {"name": base, "degrees": set(), "count": 0})
            if mj["degree"]:
                e["degrees"].add(mj["degree"])
            e["count"] += 1
    major_options = sorted(major_counts.values(), key=lambda e: (-e["count"], e["name"]))
    major_options = [{"name": e["name"], "degrees": sorted(e["degrees"]), "count": e["count"]} for e in major_options]

    total_positions = sum(len(c["positions"]) for c in companies)
    total_headcount = sum(c["headcount"] or 0 for c in companies)
    payload = {
        "meta": {
            "sourceFile": src.name,
            "generatedAt": date.today().isoformat(),
            "approvedRows": len(approved),
            "mergedCompanies": len(groups),
            "skippedRows": skipped,
            "totalCompanies": len(companies),
            "totalPositions": total_positions,
            "totalHeadcount": total_headcount,
            "regions": REGION_LABELS,
            "majorOptions": major_options,
        },
        "companies": companies,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(f"approved rows: {len(approved)}, merged companies: {len(companies)}, positions: {total_positions}, headcount: {total_headcount}")
    print(f"wrote {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
    empty_pos = [c["name"] for c in companies if not c["positions"]]
    empty_mj = [c["name"] for c in companies if not c["majors"] and not c["noLimit"]]
    print(f"companies without positions: {len(empty_pos)}; without majors/noLimit: {len(empty_mj)}")
    region_cnt = {}
    for c in companies:
        region_cnt[c["region"]] = region_cnt.get(c["region"], 0) + 1
    print("regions:", region_cnt)
    print("sample majors:", [m["name"] for m in major_options[:8]])


if __name__ == "__main__":
    main()
