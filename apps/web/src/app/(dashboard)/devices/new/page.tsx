"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, X } from "lucide-react";
import { Button } from "@cortexgrid/ui/components/Button";
import { Input } from "@cortexgrid/ui/components/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@cortexgrid/ui/components/Card";
import { apiClient } from "@/lib/api-client";

const createDeviceSchema = z.object({
  name: z
    .string()
    .min(2, "Device name must be at least 2 characters")
    .max(100, "Device name must be under 100 characters"),
  description: z.string().max(500, "Description too long").optional(),
  type: z.enum(["SENSOR", "ACTUATOR", "GATEWAY"] as const, {
    required_error: "Device type is required",
  }),
  serialNumber: z.string().optional(),
  location: z.string().max(200, "Location too long").optional(),
  firmwareVersion: z.string().optional(),
  tags: z.string().optional(),
  metadata: z.string().optional(),
});

type CreateDeviceFormValues = z.infer<typeof createDeviceSchema>;

export default function NewDevicePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeviceFormValues>({
    resolver: zodResolver(createDeviceSchema),
    defaultValues: {
      name: "",
      description: "",
      type: undefined,
      serialNumber: "",
      location: "",
      firmwareVersion: "",
      tags: "",
      metadata: "",
    },
  });

  const onSubmit = async (data: CreateDeviceFormValues) => {
    setServerError(null);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        serialNumber: data.serialNumber || undefined,
        location: data.location || undefined,
        firmwareVersion: data.firmwareVersion || undefined,
        tags: data.tags
          ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        metadata: data.metadata
          ? JSON.parse(data.metadata)
          : undefined,
      };
      await apiClient.post("/api/devices", payload);
      router.push("/devices");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create device";
      setServerError(message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/devices")}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
            Add New Device
          </h1>
          <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
            Register a new IoT device to your organization
          </p>
        </div>
      </div>

      {serverError && (
        <div
          className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Device Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Device Name"
              placeholder="e.g. Temperature Sensor A1"
              error={errors.name?.message}
              {...register("name")}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">
                Device Type <span className="text-danger-500">*</span>
              </label>
              <select
                {...register("type")}
                className="h-10 w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
              >
                <option value="">Select device type</option>
                <option value="SENSOR">Sensor</option>
                <option value="ACTUATOR">Actuator</option>
                <option value="GATEWAY">Gateway</option>
              </select>
              {errors.type && (
                <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400" role="alert">
                  {errors.type.message}
                </p>
              )}
            </div>

            <Input
              label="Description"
              placeholder="Brief description of the device"
              error={errors.description?.message}
              {...register("description")}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Serial Number"
                placeholder="e.g. SN-TMP-001"
                error={errors.serialNumber?.message}
                {...register("serialNumber")}
              />
              <Input
                label="Firmware Version"
                placeholder="e.g. 2.1.4"
                error={errors.firmwareVersion?.message}
                {...register("firmwareVersion")}
              />
            </div>

            <Input
              label="Location"
              placeholder="e.g. Building A, Floor 2"
              error={errors.location?.message}
              {...register("location")}
            />

            <Input
              label="Tags"
              placeholder="Comma-separated tags (e.g. temperature, lab, precision)"
              helperText="Separate multiple tags with commas"
              error={errors.tags?.message}
              {...register("tags")}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">
                Custom Metadata (JSON)
              </label>
              <textarea
                {...register("metadata")}
                rows={3}
                placeholder='{"accuracy": "0.1C", "range": "-40 to 125C"}'
                className="w-full rounded-lg border border-dark-300 bg-white px-3 py-2 font-mono text-sm text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100 dark:placeholder:text-dark-500"
              />
              {errors.metadata && (
                <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400" role="alert">
                  {errors.metadata.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/devices")}
            leftIcon={<X className="h-4 w-4" />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isSubmitting ? "Creating..." : "Create Device"}
          </Button>
        </div>
      </form>
    </div>
  );
}
