"use client";

import { useLayoutEffect, useTransition, type FormEvent } from "react";
import { createProject } from "@/app/actions/projects";
import { useFormErrors } from "@/hooks/useFormErrors";
import { useFormValues } from "@/hooks/useFormValues";
import type { ProjectInput, SoftwareCategory } from "@/types";

type CreateValues = {
  name: string;
  summary: string;
  category: SoftwareCategory;
  planned_hours: string;
};

const INITIAL_VALUES: CreateValues = {
  name: "",
  summary: "",
  category: "web",
  planned_hours: "",
};

// プロジェクト登録モーダルのフォーム。登録時に入力しない項目は既定値で作成する
export function useProjectCreateForm() {
  const { values, setValues, bind } = useFormValues(INITIAL_VALUES);
  const { errors, message, clear, fail } = useFormErrors<keyof ProjectInput>();
  const [pending, startTransition] = useTransition();

  // Cache Components では閉じたモーダルもアンマウントされず <Activity> で隠されるだけなので、
  // 隠れるタイミングで入力値・エラーを初期状態へ戻す
  useLayoutEffect(() => {
    return () => {
      setValues(INITIAL_VALUES);
      clear();
    };
  }, [setValues, clear]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    clear();
    startTransition(async () => {
      // 成功時はサーバー側で一覧へリダイレクトするため、戻り値があるのは失敗時のみ
      const result = await createProject({
        ...values,
        status: "not_started",
        tech_stack: "",
        scope_step1: "",
        scope_step2: "",
        links: [],
      });
      if (result) fail(result.errors, result.message);
    });
  };

  return { values, bind, errors, message, pending, handleSubmit };
}
