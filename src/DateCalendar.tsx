import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

// Split out so react-day-picker (and date-fns under it) loads only when a
// desktop visitor opens the quote form — see DateField.
export default function DateCalendar({
  selected,
  today,
  onSelect,
}: {
  selected: Date | undefined;
  today: Date;
  onSelect: (date: Date | undefined) => void;
}) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      defaultMonth={selected ?? today}
      startMonth={today}
      disabled={{ before: today }}
      weekStartsOn={0}
      modifiers={{ sunday: { dayOfWeek: [0] } }}
      modifiersClassNames={{ sunday: "is-sunday" }}
    />
  );
}
