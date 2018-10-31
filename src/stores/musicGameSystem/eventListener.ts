import Chart from "../Chart";

export default interface IMusicGameSystemEventListener {
  onSave?: (chart: Chart) => void;
}
