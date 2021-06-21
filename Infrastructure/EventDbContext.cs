using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.IO;
using System.Text.Json.Serialization;

namespace EventsStorage.Infrastructure
{
    public class ComponentEventDbContextFactory : IDesignTimeDbContextFactory<EventDbContext>
    {
        public EventDbContext CreateDbContext(string[] args)
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

            IConfigurationRoot configuration = builder.Build();

            return new EventDbContext(configuration);
        }
    }

    public class EventDbContext : DbContext
    {
        private static bool _migrated;
        private static readonly ILoggerFactory _loggerFactory = LoggerFactory.Create(builder => { builder.AddConsole(); });
        private readonly IConfiguration _configuration;
        public virtual DbSet<AppEvent> Events { get; set; }
        public virtual DbSet<EventSubject> Subjects { get; set; }
        public virtual DbSet<EventFile> Files { get; set; }
        
        // For unit test only
        public EventDbContext()
        {
        }

        public EventDbContext(IConfiguration configuration)
        {
            _configuration = configuration;

            if (!_migrated)
            {
                _migrated = true;
                Database.Migrate();
            }
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                optionsBuilder.UseSqlServer(_configuration.GetConnectionString("EventStorage")); 
                optionsBuilder.UseLoggerFactory(_loggerFactory);
                optionsBuilder.EnableSensitiveDataLogging(true);
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            //Write Fluent API configurations here
            modelBuilder.Entity<EventFile>()
                .HasOne(ef => ef.Event)
                .WithMany(e => e.Files)
                .HasForeignKey(ef => ef.EventId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EventSubject>()
                .HasData(new EventSubject[] {
                    new EventSubject
                    {
                        Id = 1,
                        Name = "Subject1"
                    },
                    new EventSubject
                    {
                        Id = 2,
                        Name = "Subject2"
                    },
                    new EventSubject
                    {
                        Id = 3,
                        Name = "Subject3"
                    },
                });

            base.OnModelCreating(modelBuilder);
        }
    }

    public class AppEvent
    {
        [Key]
        public long Id { get; set; }
        public int SubjectId { get; set; }
        public EventSubject Subject { get; set; }
        public DateTime CreatedAt { get; set; }
        public ICollection<EventFile> Files { get; set; }
    }

    public class EventSubject
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
    }

    public class EventFile
    {
        [Key]
        public long Id { get; set; }

        [Column(TypeName = "nvarchar(255)")]
        public string Name { get; set; }
        public DateTime CreatedAt { get; set; }
        [JsonIgnore]
        public byte[] Content { get; set; }
        [JsonIgnore]
        [Column(TypeName = "varchar(255)")]
        public string ContentType { get; set; }
        public long EventId { get; set; }
        public AppEvent Event { get; set; }
    }
}
