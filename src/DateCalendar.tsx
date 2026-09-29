import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

// Split out so react-day-picker (and date-fns under it) loads only when a
// desktop visitor opens the quote form — see DateField.
export default function DateCalendar({
  selected,
  earliest,
  onSelect,
}: {
  selected: Date | undefined;
  earliest: Date;
  onSelect: (date: Date | undefined) => void;
}) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      defaultMonth={selected ?? earliest}
      startMonth={earliest}
      disabled={{ before: earliest }}
      weekStartsOn={0}
    />
  );
}
