using Microsoft.EntityFrameworkCore;
using SimpleTaskBackend.Data;
using SimpleTaskBackend.Endpoints;
using SimpleTaskBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();
builder.Services.AddCors();

// Add In-Memory Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("SimpleTaskDb"));

// Register Services
builder.Services.AddScoped<ITaskService, TaskService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Enable CORS
app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

// Register Endpoints
app.MapTaskEndpoints();

app.Run();

namespace SimpleTaskBackend
{
    public class Program { }
}
