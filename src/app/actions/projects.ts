"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { projectRepository } from "@/lib/repositories";
import {
  validateProjectInput,
  type ProjectFieldErrors,
} from "@/lib/validation/project";

export type ProjectActionResult = { errors: ProjectFieldErrors } | undefined;

export async function createProject(
  input: unknown,
): Promise<ProjectActionResult> {
  const result = validateProjectInput(input);
  if (!result.ok) return { errors: result.errors };

  await projectRepository.create(result.data);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProject(
  id: string,
  input: unknown,
): Promise<ProjectActionResult> {
  const result = validateProjectInput(input);
  if (!result.ok) return { errors: result.errors };

  const existing = await projectRepository.get(id);
  if (!existing) redirect("/");

  await projectRepository.update(id, result.data);
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await projectRepository.delete(id);
  revalidatePath("/", "layout");
  redirect("/");
}
