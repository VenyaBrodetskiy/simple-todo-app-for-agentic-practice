using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using SimpleTaskBackend.Filters;
using SimpleTaskBackend.Models.Requests;
using SimpleTaskBackend.Models.Responses;
using SimpleTaskBackend.Services;
using DbTask = SimpleTaskBackend.Models.Db.Task;

namespace SimpleTaskBackend.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/tasks");

        group.MapGet("/", async (ITaskService service, ILogger<Program> logger) =>
        {
            try
            {
                if (Random.Shared.NextDouble() < 0.4)
                {
                    await Task.Delay(Random.Shared.Next(2000, 5000));
                }

                var tasks = await service.GetAllAsync();
                var response = tasks.Select(MapToResponse).ToList();
                return Results.Ok(response);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error getting tasks");
                return Results.InternalServerError();
            }
        })
        .WithName("GetTasks");

        group.MapPost("/", async ([FromBody] CreateTaskRequest request, ITaskService service, ILogger<Program> logger) =>
        {
            try
            {
                var newTask = new DbTask
                {
                    Title = request.Title
                };

                var createdTask = await service.CreateAsync(newTask);
                var response = MapToResponse(createdTask);

                return Results.Created($"/api/tasks/{createdTask.Id}", response);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error creating task");
                return Results.InternalServerError();
            }
        })
        .WithName("CreateTask")
        .AddEndpointFilter<ValidationFilter<CreateTaskRequest>>();

        group.MapPatch("/{id:guid}", async (Guid id, [FromBody] UpdateTaskRequest request, ITaskService service, ILogger<Program> logger) =>
        {
            try
            {
                var updatedTask = await service.UpdateAsync(id, request.Title, request.IsCompleted);

                if (updatedTask is null)
                {
                    return Results.NotFound();
                }

                return Results.Ok(MapToResponse(updatedTask));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error updating task");
                return Results.InternalServerError();
            }
        })
        .WithName("UpdateTask")
        .AddEndpointFilter<ValidationFilter<UpdateTaskRequest>>();
    }

    private static TaskResponse MapToResponse(DbTask task)
    {
        return new TaskResponse
        {
            Id = task.Id,
            Title = task.Title,
            IsCompleted = task.IsCompleted,
            CreatedAt = task.CreatedAt
        };
    }
}
