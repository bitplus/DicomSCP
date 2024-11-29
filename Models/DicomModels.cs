namespace DicomSCP.Models;

public class Patient
{
    public string PatientId { get; set; } = null!;
    public string? PatientName { get; set; }
    public string? PatientBirthDate { get; set; }
    public string? PatientSex { get; set; }
    public DateTime CreateTime { get; set; }
}

public class Study
{
    public string StudyInstanceUid { get; set; } = null!;
    public string PatientId { get; set; } = null!;
    public string? StudyDate { get; set; }
    public string? StudyTime { get; set; }
    public string? StudyDescription { get; set; }
    public string? AccessionNumber { get; set; }
    public DateTime CreateTime { get; set; }
}

public class Series
{
    public string SeriesInstanceUid { get; set; } = null!;
    public string StudyInstanceUid { get; set; } = null!;
    public string? Modality { get; set; }
    public string? SeriesNumber { get; set; }
    public string? SeriesDescription { get; set; }
    public DateTime CreateTime { get; set; }
    public int NumberOfInstances { get; set; }
    public string? StudyModality { get; set; }
}

public class Instance
{
    public string SopInstanceUid { get; set; } = null!;
    public string SeriesInstanceUid { get; set; } = null!;
    public string SopClassUid { get; set; } = null!;
    public string? InstanceNumber { get; set; }
    public string FilePath { get; set; } = null!;
    public DateTime CreateTime { get; set; }
}

public class WorklistItem
{
    public string WorklistId { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientBirthDate { get; set; } = string.Empty;
    public string PatientSex { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string StudyInstanceUid { get; set; } = string.Empty;
    public string StudyDescription { get; set; } = string.Empty;
    public string Modality { get; set; } = string.Empty;
    public string ScheduledAET { get; set; } = string.Empty;
    public string ScheduledDateTime { get; set; } = string.Empty;
    public string ScheduledStationName { get; set; } = string.Empty;
    public string ScheduledProcedureStepID { get; set; } = string.Empty;
    public string ScheduledProcedureStepDescription { get; set; } = string.Empty;
    public string RequestedProcedureID { get; set; } = string.Empty;
    public string RequestedProcedureDescription { get; set; } = string.Empty;
    public string ReferringPhysicianName { get; set; } = string.Empty;
    public string Status { get; set; } = "SCHEDULED";
    public string BodyPartExamined { get; set; } = string.Empty;
    public string ReasonForRequest { get; set; } = string.Empty;
    public DateTime CreateTime { get; set; }
    public DateTime UpdateTime { get; set; }
    public string AccessionNumber { get; set; } = string.Empty;
}

public class StudyInfo
{
    public string StudyInstanceUid { get; set; } = string.Empty;
    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientSex { get; set; } = string.Empty;
    public string PatientBirthDate { get; set; } = string.Empty;
    public string AccessionNumber { get; set; } = string.Empty;
    public string Modality { get; set; } = string.Empty;
    public string StudyDate { get; set; } = string.Empty;
    public string StudyDescription { get; set; } = string.Empty;
}

public class SeriesInfo
{
    public string SeriesInstanceUid { get; set; } = string.Empty;
    public string SeriesNumber { get; set; } = string.Empty;
    public string Modality { get; set; } = string.Empty;
    public string SeriesDescription { get; set; } = string.Empty;
    public int NumberOfInstances { get; set; }
}