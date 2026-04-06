import React from "react";
import LessonScreen from "./src/LessonScreen";
import lessonData from "./assets/lesson-01.json";
import { type Lesson } from "./src/types";

export default function App() {
  return <LessonScreen lesson={lessonData as unknown as Lesson} />;
}
