import { useTranslation } from "next-i18next/pages";

import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import useCurrentTime from "utils/hooks/use-current-time";
import useWidgetAPI from "utils/proxy/use-widget-api";

const DAY = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" -> local midnight of that date
function parseDue(due) {
  const [year, month, day] = due.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// whole days from today, in the viewer's time zone
function daysFromToday(dueDate, currentTime) {
  const now = new Date(currentTime);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dueDate - today) / DAY);
}

// tasks with a due date first (soonest first), then the rest in list order
function compareTasks(a, b) {
  if (a.due && b.due) return a.due.localeCompare(b.due) || a.position.localeCompare(b.position);
  if (a.due) return -1;
  if (b.due) return 1;
  return a.position.localeCompare(b.position);
}

export default function Component({ service }) {
  const { t, i18n } = useTranslation();
  const currentTime = useCurrentTime();
  const { widget } = service;
  const enableBlocks = widget.enableBlocks ?? true;

  const { data, error } = useWidgetAPI(widget);

  if (error || data?.error) {
    return <Container service={service} error={error ?? data.error} />;
  }

  if (!data) {
    if (!enableBlocks) return null;

    return (
      <Container service={service}>
        <Block label="googletasks.open" />
        <Block label="googletasks.dueToday" />
        <Block label="googletasks.overdue" />
      </Container>
    );
  }

  const tasks = data.tasks.map((task) => {
    const dueDate = task.due ? parseDue(task.due) : null;
    return { ...task, dueDate, days: dueDate ? daysFromToday(dueDate, currentTime) : null };
  });
  const dueToday = tasks.filter((task) => task.days === 0);
  const overdue = tasks.filter((task) => task.days !== null && task.days < 0);

  const relativeDay = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });
  const formatDue = (task) => {
    // beyond a week, the date itself is easier to read than "in 23 days"
    if (Math.abs(task.days) <= 7) return relativeDay.format(task.days, "day");
    // "YYYY-MM-DD" -> "DD.MM.YYYY"
    return task.due.split("-").reverse().join(".");
  };

  return (
    <>
      {enableBlocks && (
        <Container service={service}>
          <Block label="googletasks.open" value={t("common.number", { value: tasks.length })} />
          <Block label="googletasks.dueToday" value={t("common.number", { value: dueToday.length })} />
          <Block label="googletasks.overdue" value={t("common.number", { value: overdue.length })} />
        </Container>
      )}
      {widget.enableTaskList &&
        tasks
          .sort(compareTasks)
          .slice(0, 10)
          .map((task) => (
            <div
              key={task.id}
              className="text-theme-700 dark:text-theme-200 relative rounded-md bg-theme-200/50 dark:bg-theme-900/20 m-1 px-1 py-0.5 flex"
            >
              <div className="text-sm z-10 self-center ml-2 mr-2 grow min-w-0">
                <div className="whitespace-nowrap text-ellipsis overflow-hidden text-left">{task.title}</div>
                {task.notes && (
                  <div
                    className="whitespace-nowrap text-ellipsis overflow-hidden text-left text-xs opacity-60"
                    title={task.notes}
                  >
                    {task.notes}
                  </div>
                )}
              </div>
              {task.days !== null && (
                <div
                  className={`self-center text-sm flex justify-end mr-1.5 pl-1 z-10 whitespace-nowrap ${
                    task.days < 0 ? "text-rose-500" : ""
                  }`}
                >
                  {formatDue(task)}
                </div>
              )}
            </div>
          ))}
    </>
  );
}
