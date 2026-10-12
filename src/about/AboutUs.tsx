import { Briefcase, Wrench } from "lucide-react";

export function AboutUs() {
  return (
    <div className="mt-4">
      <p className="rounded-xl bg-accent px-4 py-3 text-sm leading-relaxed text-accent-foreground">
        本页面由<span className="font-semibold">浙江农林大学EPA就业与实践发展协会</span>和
        <span className="font-semibold">浙江农林大学电脑医院</span>联合提供。
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="flex items-start gap-2 text-sm font-semibold">
            <Briefcase className="mt-0.5 size-4 shrink-0 text-primary" />
            浙江农林大学EPA就业与实践发展协会
          </h2>
          <p className="mt-1 pl-6 text-[11px] text-muted-foreground">简称 EPA 就协</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            挂靠校学工部、学生处就业指导服务中心的校级学生组织，以“源于学生，服务学生”为宗旨，以“实践、创业、就业”为工作重点，秉持“纯粹，职业，温暖”的精神。
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">我们不贩卖焦虑，我们只提前剧透职场：</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground/80 marker:text-primary/50">
            <li>
              <span className="font-medium text-foreground">大型校园招聘会</span>，我们协助操盘
            </li>
            <li>
              <span className="font-medium text-foreground">用人单位专场宣讲会</span>，我们对接落地
            </li>
            <li>
              “<span className="font-medium text-foreground">职场体验行</span>”，我们带你走出校园、走进企业
            </li>
            <li>
              <span className="font-medium text-foreground">职业生涯规划大赛、普通话等级考试</span>，我们承办组织
            </li>
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="flex items-start gap-2 text-sm font-semibold">
            <Wrench className="mt-0.5 size-4 shrink-0 text-primary" />
            浙江农林大学电脑医院
          </h2>
          <p className="mt-1 pl-6 text-[11px] text-muted-foreground">成立于 2003 年</p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">
            秉承“源于浙林，奉献浙林”的精神，在全校范围内提供<span className="font-medium text-foreground">免费</span>
            的电脑系统、软件修护、硬件故障排查、技术咨询以及其他电脑、手机相关的技术支持。
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            至今已提供<span className="font-medium text-foreground">3 万余次服务</span>，累计为学生节省开支
            <span className="font-medium text-foreground">近两百万元</span>。目前也为各学生组织提供数字化、AI化改造解决方案。
          </p>
          <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            维修咨询 QQ 群：<span className="tabular-nums">121497441、532502904</span>
          </p>
        </section>
      </div>
    </div>
  );
}
