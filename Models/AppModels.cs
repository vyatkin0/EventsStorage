using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;
using EventsStorage.Infrastructure;

namespace EventsStorage.Models
{
    public class AddEventViewModel
    {
        [Required]
        public int SubjectId { get; set; }
        [Required]
        public string Description { get; set; }
    }
    public class UploadEventFileViewModel
    {
        [Required]
        public long eventId { get; set; }
        public int fileType { get; set; }
        [Required]
        public IFormFile formFile { get; set; }
    }

    public class EventListViewModel
    {
        public AppEvent[] events { get; set; }
        public EventSubject[] subjects { get; set; }
        public int offset { get; set; }
        public int count { get; set; }
        public int total { get; set; }
    }
}
